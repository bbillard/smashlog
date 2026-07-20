// app.plugin.js — Fix Apple App Store Connect error 90542
// XRSimulator in CFBundleSupportedPlatforms of ReactNativeDependencies bundles.
//
// Two-layer fix:
// 1. post_install Part 1 — patch plist files in Pods sandbox (before Xcode copies them)
// 2. post_install Part 2 — add Xcode Run Script build phase (runs after Embed Pods Frameworks)
//
// The build phase targets specifically ReactNativeDependencies.framework to avoid
// accidentally stripping CFBundleSupportedPlatforms from other plists.

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PHASE_NAME = "Fix XRSimulator CFBundleSupportedPlatforms";

module.exports = (config) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes(PHASE_NAME)) return config;

      // JS template literal escaping notes:
      //   \`...\`   → Ruby backtick command execution
      //   \#{...}  → Ruby string interpolation (# not special in JS, \ is ignored)
      //   \${...}  → escaped JS template: becomes ${...} in the Podfile (shell var)

      const rubyPatch = `
  # ── Fix 90542: XRSimulator in CFBundleSupportedPlatforms ─────────────────────
  begin
    sandbox_root = installer.sandbox.root.to_s

    # Part 1: remove XRSimulator from bundle plists in the Pods sandbox.
    # Target specifically ReactNativeDependencies to avoid touching other plists.
    rnd_pattern = File.join(sandbox_root, '**', 'ReactNativeDependencies*', '**', '*.bundle', 'Info.plist')
    fallback_pattern = File.join(sandbox_root, '**', '*.bundle', 'Info.plist')

    ([rnd_pattern, fallback_pattern]).each do |pattern|
      Dir.glob(pattern).each do |plist|
        begin
          check = \`/usr/libexec/PlistBuddy -c 'Print :CFBundleSupportedPlatforms' "\#{plist}" 2>&1\`
          if check.include?('XRSimulator')
            \`/usr/libexec/PlistBuddy -c 'Delete :CFBundleSupportedPlatforms' "\#{plist}" 2>/dev/null\`
            puts "[Fix90542] Patched pod plist: \#{plist}"
          end
        rescue => e
          # silent — continue with next file
        end
      end
    end

    # Part 2: add a Run Script build phase to also fix bundles after Embed Pods Frameworks.
    require 'xcodeproj'
    xcodeproj_path = Dir.glob(File.join(File.dirname(sandbox_root), '*.xcodeproj')).first
    if xcodeproj_path
      project = Xcodeproj::Project.open(xcodeproj_path)
      app_target = project.targets.find { |t| t.product_type == 'com.apple.product-type.application' }
      if app_target && app_target.shell_script_build_phases.none? { |p| p.name == '${PHASE_NAME}' }
        phase = app_target.new_shell_script_build_phase('${PHASE_NAME}')
        phase.shell_path = '/bin/sh'
        # Find Info.plist files specifically inside ReactNativeDependencies.framework
        # then remove CFBundleSupportedPlatforms from each.
        phase.shell_script = 'APP="\${CODESIGNING_FOLDER_PATH:-\${TARGET_BUILD_DIR}/\${WRAPPER_NAME}}"\\nFWK="$APP/Frameworks/ReactNativeDependencies.framework"\\nif [ -d "$FWK" ]; then\\n  find "$FWK" -name Info.plist 2>/dev/null | while IFS= read -r p; do\\n    /usr/libexec/PlistBuddy -c "Delete :CFBundleSupportedPlatforms" "$p" 2>/dev/null && echo "[Fix90542] Build phase fixed: $p"\\n  done\\nfi'
        project.save
        puts "[Fix90542] Added Xcode build phase to \#{File.basename(xcodeproj_path)}"
      end
    else
      puts "[Fix90542] Warning: no .xcodeproj found in \#{File.dirname(sandbox_root)}"
    end
  rescue => e
    puts "[Fix90542] Error: \#{e.message}"
    puts e.backtrace.first(5).join("\\n") rescue nil
  end
  # ─────────────────────────────────────────────────────────────────────────────
`;

      // ── Fix fmt consteval build error under newer Xcode/Clang ──────────────────
      // Newer Clang (Xcode 26.x) tightened consteval constant-expression checking,
      // which breaks the {fmt} pod's FMT_COMPILE_STRING format-string validation.
      // Compiling only the 'fmt' pod as C++17 skips that codepath (consteval doesn't
      // exist pre-C++20), while the rest of the project keeps C++20.
      //
      // IMPORTANT: react_native_post_install() calls
      // NewArchitectureHelper.set_clang_cxx_language_standard_if_needed, which force-sets
      // CLANG_CXX_LANGUAGE_STANDARD back to c++20 on every pod target (including fmt).
      // This patch MUST run AFTER the react_native_post_install(...) call, not before,
      // or it gets silently overwritten.
      const fmtPatch = `
  # ── Fix fmt consteval build error under newer Xcode/Clang ────────────────────
  begin
    is_fmt_pod = ->(name) { name == 'fmt' || name.start_with?('fmt-') }

    installer.pods_project.targets.each do |target|
      if is_fmt_pod.call(target.name)
        target.build_configurations.each do |config|
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
        puts "[FixFmtConsteval] Set fmt pod to C++17 (pods_project target: \#{target.name})"
      end
    end

    if installer.respond_to?(:target_installation_results)
      installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|
        if is_fmt_pod.call(pod_name)
          target_installation_result.native_target.build_configurations.each do |config|
            config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
          end
          puts "[FixFmtConsteval] Set fmt pod to C++17 (target_installation_results: \#{pod_name})"
        end
      end
    end
  rescue => e
    puts "[FixFmtConsteval] Error: \#{e.message}"
  end
  # ─────────────────────────────────────────────────────────────────────────────
`;

      // react_native_post_install(...) is typically a multi-line call ending with
      // a line that contains only a closing paren. Insert the fmt patch right after
      // it so our override runs after RN's helper, not before.
      const reactNativePostInstallCallRegex =
        /(react_native_post_install\(\s*[\s\S]*?\n\s*\))/;

      if (
        !podfile.includes("[FixFmtConsteval]") &&
        podfile.match(reactNativePostInstallCallRegex)
      ) {
        podfile = podfile.replace(
          reactNativePostInstallCallRegex,
          `$1${fmtPatch}`,
        );
      } else if (!podfile.includes("[FixFmtConsteval]")) {
        // Fallback: no react_native_post_install(...) call found (unexpected
        // template). Append at the end of post_install as a best effort.
        podfile = podfile.replace(
          /(post_install do \|installer\|[\s\S]*?)(\n\s*end)/,
          `$1${fmtPatch}$2`,
        );
      }

      if (podfile.match(/post_install do \|installer\|/)) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${rubyPatch}`,
        );
      } else {
        podfile += `\npost_install do |installer|\n${rubyPatch}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

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

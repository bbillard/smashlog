import { Ionicons } from '@expo/vector-icons';
import { randomUUID } from 'expo-crypto';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { addPlayer, getPlayerById, getPlayers, getSessions } from '@/src/services/storage';
import { Player } from '@/src/types/index';

// ─── Couleurs avatar ─────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#CEFF00', '#00E5FF', '#FFD166', '#C084FC', '#00E5C8', '#FF8C00'];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0xfffff;
  }
  return Math.abs(h);
}

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
}

// ─── Normalisation pour le filtrage (insensible à la casse et aux accents) ──

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// ─── Types internes ───────────────────────────────────────────────────────────

interface PlayerStats {
  total: number;
  wins: number;
  losses: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PlayerAutocompleteProps {
  label: string;
  value: string | null;          // Player.id sélectionné ou null
  onChange: (playerId: string | null) => void;
  placeholder?: string;
  /** Texte pré-rempli dans le champ quand value est null (mode édition, donnée legacy). */
  defaultText?: string;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function PlayerAutocomplete({
  label,
  value,
  onChange,
  placeholder = 'Nom du joueur...',
  defaultText,
}: PlayerAutocompleteProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, PlayerStats>>({});
  const [inputText, setInputText] = useState(defaultText ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [inputBoxHeight, setInputBoxHeight] = useState(0);

  const inputRef = useRef<TextInput>(null);
  // Flag pour éviter la fermeture du dropdown lors du tap sur une suggestion
  const isPressingSuggestion = useRef(false);

  // ── Chargement des données ────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const [allPlayers, sessions] = await Promise.all([getPlayers(), getSessions()]);
    setPlayers(allPlayers);

    // Calcul des stats par joueur à partir des sessions
    const map: Record<string, PlayerStats> = {};

    const ensureEntry = (id: string) => {
      if (!map[id]) map[id] = { total: 0, wins: 0, losses: 0 };
    };

    for (const session of sessions) {
      for (const match of session.matches ?? []) {
        // Résoudre l'adversaire : préférer l'id, sinon chercher par nom normalisé (legacy)
        const advId =
          match.adversaireId ??
          allPlayers.find(
            (p) => match.adversaire && normalize(p.name) === normalize(match.adversaire),
          )?.id;

        if (advId) {
          ensureEntry(advId);
          map[advId].total++;
          if (match.resultat === 'victoire') map[advId].wins++;
          else map[advId].losses++;
        }

        // Résoudre le partenaire (double/mixte)
        const partId =
          match.partenaireId ??
          allPlayers.find(
            (p) => match.partenaire && normalize(p.name) === normalize(match.partenaire),
          )?.id;

        if (partId && partId !== advId) {
          ensureEntry(partId);
          map[partId].total++;
          if (match.resultat === 'victoire') map[partId].wins++;
          else map[partId].losses++;
        }

        // partenaireIds (double avec plusieurs partenaires)
        for (const pid of match.partenaireIds ?? []) {
          if (pid !== advId && pid !== partId) {
            ensureEntry(pid);
            map[pid].total++;
            if (match.resultat === 'victoire') map[pid].wins++;
            else map[pid].losses++;
          }
        }
      }
    }

    setStatsMap(map);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Résolution du joueur sélectionné depuis la prop value ────────────────

  useEffect(() => {
    if (!value) {
      setSelectedPlayer(null);
      return;
    }
    getPlayerById(value).then((p) => setSelectedPlayer(p));
  }, [value]);

  // ── Filtrage des suggestions ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = normalize(inputText);
    if (!q) return [];
    return players.filter((p) => normalize(p.name).includes(q));
  }, [players, inputText]);

  const showDropdown = isFocused && inputText.trim().length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = (player: Player) => {
    isPressingSuggestion.current = false;
    setInputText('');
    setIsFocused(false);
    inputRef.current?.blur();
    onChange(player.id);
  };

  const handleCreate = async () => {
    isPressingSuggestion.current = false;
    const name = inputText.trim();
    if (!name) return;

    const newPlayer: Player = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      name,
    };
    await addPlayer(newPlayer);
    // Mise à jour locale immédiate sans attendre un rechargement
    setPlayers((prev) => [...prev, newPlayer]);
    setInputText('');
    setIsFocused(false);
    inputRef.current?.blur();
    onChange(newPlayer.id);
  };

  const handleBlur = () => {
    // Délai pour laisser le temps au onPress de la suggestion de s'exécuter
    setTimeout(() => {
      if (!isPressingSuggestion.current) {
        setIsFocused(false);
        setInputText('');
      }
    }, 150);
  };

  const handleClear = () => {
    onChange(null);
    setSelectedPlayer(null);
    setInputText('');
  };

  // ── Helpers de rendu ─────────────────────────────────────────────────────

  const renderHighlightedName = (name: string, query: string) => {
    const normName = normalize(name);
    const normQ = normalize(query);
    const idx = normName.indexOf(normQ);
    if (idx === -1) return <Text style={styles.sugName}>{name}</Text>;

    return (
      <Text style={styles.sugName}>
        {name.slice(0, idx)}
        <Text style={styles.sugNameMatch}>{name.slice(idx, idx + query.length)}</Text>
        {name.slice(idx + query.length)}
      </Text>
    );
  };

  const renderStats = (playerId: string) => {
    const s = statsMap[playerId];
    if (!s || s.total === 0) {
      return <Text style={styles.sugStats}>Aucun match enregistré</Text>;
    }
    return (
      <Text style={styles.sugStats}>
        {s.total} match{s.total > 1 ? 's' : ''} · {s.wins}V {s.losses}D
      </Text>
    );
  };

  const avatarStyle = (name: string) => {
    const color = getAvatarColor(name);
    // ~10% opacity hex suffix: 1A
    return { bg: color + '1A', text: color };
  };

  // ── État : joueur sélectionné (tag) ──────────────────────────────────────

  if (selectedPlayer) {
    const av = avatarStyle(selectedPlayer.name);
    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.tag}>
          <View style={[styles.tagAvatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.tagAvatarText, { color: av.text }]}>
              {selectedPlayer.name[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.tagName}>{selectedPlayer.name}</Text>
          <Pressable onPress={handleClear} hitSlop={8} style={styles.tagRemove}>
            <Ionicons name="close" size={10} color="#6B6B7A" />
          </Pressable>
        </View>
      </View>
    );
  }

  // ── État : champ de saisie (vide ou en cours) ─────────────────────────────

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {/* zIndex élevé sur le wrapper pour que le dropdown passe au-dessus des siblings */}
      <View style={styles.fieldWrap}>
        <View
          style={[styles.inputBox, isFocused && styles.inputBoxFocused]}
          onLayout={(e) => setInputBoxHeight(e.nativeEvent.layout.height)}
        >
          <Ionicons
            name="person-outline"
            size={14}
            color={isFocused ? '#FF4D6D' : '#6B6B7A'}
          />
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor="rgba(107,107,122,0.45)"
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {inputText.length > 0 && (
            <Pressable onPress={() => setInputText('')} hitSlop={8}>
              <View style={styles.clearBtn}>
                <Ionicons name="close" size={9} color="#6B6B7A" />
              </View>
            </Pressable>
          )}
        </View>

        {showDropdown && inputBoxHeight > 0 && (
          <View style={[styles.dropdown, { top: inputBoxHeight + 4 }]}>
            {filtered.length > 0 && (
              <>
                <Text style={styles.dropdownSectionLabel}>Mes joueurs</Text>
                {filtered.map((player) => {
                  const av = avatarStyle(player.name);
                  return (
                    <Pressable
                      key={player.id}
                      style={({ pressed }) => [
                        styles.suggestion,
                        pressed && styles.suggestionPressed,
                      ]}
                      onPressIn={() => {
                        isPressingSuggestion.current = true;
                      }}
                      onPressOut={() => {
                        isPressingSuggestion.current = false;
                      }}
                      onPress={() => handleSelect(player)}
                    >
                      <View style={[styles.sugAvatar, { backgroundColor: av.bg }]}>
                        <Text style={[styles.sugAvatarText, { color: av.text }]}>
                          {player.name[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.sugContent}>
                        {renderHighlightedName(player.name, inputText)}
                        {renderStats(player.id)}
                      </View>
                    </Pressable>
                  );
                })}
                <View style={styles.dropdownDivider} />
              </>
            )}

            {/* Option "Créer comme nouveau joueur" — toujours visible */}
            <Pressable
              style={({ pressed }) => [
                styles.createRow,
                pressed && styles.suggestionPressed,
              ]}
              onPressIn={() => {
                isPressingSuggestion.current = true;
              }}
              onPressOut={() => {
                isPressingSuggestion.current = false;
              }}
              onPress={handleCreate}
            >
              <View style={styles.createIcon}>
                <Ionicons name="add" size={13} color="#FF4D6D" />
              </View>
              <Text style={styles.createText}>
                Créer{' '}
                <Text style={styles.createTextBold}>"{inputText.trim()}"</Text>
                {' '}comme nouveau joueur
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {},

  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: '#6B6B7A',
    marginBottom: 5,
  },

  // ── Champ de saisie ─────────────────────────────────────────────────────

  fieldWrap: {
    zIndex: 100,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16161A',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  inputBoxFocused: {
    borderColor: 'rgba(255,77,109,0.4)',
  },

  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#F0F0F2',
    padding: 0,
    fontFamily: 'DMSans_400Regular',
  },

  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Dropdown ─────────────────────────────────────────────────────────────

  dropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 200,
    elevation: 20, // Android
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.25)',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },

  dropdownSectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#6B6B7A',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    fontFamily: 'Syne_700Bold',
  },

  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  suggestionPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  sugAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  sugAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Syne_700Bold',
  },

  sugContent: {
    flex: 1,
    minWidth: 0,
  },

  sugName: {
    fontSize: 13,
    color: '#F0F0F2',
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
  },

  sugNameMatch: {
    color: '#FF4D6D',
    fontWeight: '700',
    fontFamily: 'DMSans_600SemiBold',
  },

  sugStats: {
    fontSize: 10,
    color: '#6B6B7A',
    marginTop: 1,
    fontFamily: 'DMSans_400Regular',
  },

  dropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 2,
  },

  // ── Option "Créer" ───────────────────────────────────────────────────────

  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  createIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,77,109,0.1)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,77,109,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  createText: {
    flex: 1,
    fontSize: 13,
    color: '#FF4D6D',
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
  },

  createTextBold: {
    fontWeight: '700',
    fontFamily: 'DMSans_600SemiBold',
  },

  // ── Tag (joueur sélectionné) ─────────────────────────────────────────────

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(206,255,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(206,255,0,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  tagAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  tagAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Syne_700Bold',
  },

  tagName: {
    flex: 1,
    fontSize: 13,
    color: '#F0F0F2',
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
  },

  tagRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

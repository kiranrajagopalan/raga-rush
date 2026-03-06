# Raga Challenge — Difficulty Modes

This file is the **source of truth** for how session modes work in the Raga Challenge app. Edit this file to adjust mode logic or theme pools. The `SURPRISE_THEMES` constant in `raga-challenge.html` must mirror this document.

---

## Active Raga Pool

Ragas are classified into four tiers. Only Easy, Medium, and Hard are used in the app. Rare ragas are excluded from all modes.

| Tier | Count | Description |
|------|-------|-------------|
| Easy | 57 | Core well-known ragas |
| Medium | 59 | Moderately challenging ragas |
| Hard | 35 | Demanding ragas |
| Rare | 134 | Too obscure for regular practice — kept in reference only |
| **Active total** | **151** | Used across all three modes |

---

## Common Rules (all modes)

- Ragas are drawn **without replacement** within a single session
- The selected list is **shuffled** before presenting
- Surprise Me sessions that run short of the theme pool fill remaining slots from the Easy pool

---

## Mode 1 — Easy

**Intent:** Confidence-building. Familiar ragas dominate with a small stretch.

**Session size: 10 ragas**

| Draw from | Percentage | Count |
|-----------|-----------|-------|
| Easy pool (57 ragas) | 70% | 7 |
| Medium pool (59 ragas) | 30% | 3 |

---

## Mode 2 — Not So Easy

**Intent:** Sustained workout. Hard ragas are guaranteed every session. Easy ragas act as relief.

**Session size: 10 ragas**

| Draw from | Percentage | Count |
|-----------|-----------|-------|
| Easy pool (57 ragas) | 20% | 2 |
| Medium pool (59 ragas) | 50% | 5 |
| Hard pool (35 ragas) | 30% | 3 |

---

## Mode 3 — Surprise Me

**Intent:** Every raga in the session shares a hidden connection — musical, structural, or purely linguistic. The theme is revealed only on the end card after all 5 ragas are sung.

**Session size: 5 ragas (fixed — not user-adjustable)**

### How It Works

1. One theme is randomly selected from the catalogue below
2. The same theme is never repeated back-to-back (tracks last-used theme)
3. 5 ragas are drawn randomly (without replacement) from that theme's pool
4. If the theme pool has fewer than 5 ragas, remaining slots are filled from the Easy pool
5. The list is shuffled and presented
6. After the final raga, the end card shows the theme name and reveal text

---

## Surprise Me — Theme Catalogue (12 themes)

---

### Theme 1 — The "Priya" Family
**Dimension:** Name suffix — every raga name ends in *"priya"* (beloved)

| Raga | Tier |
|------|------|
| Kharaharapriya | Easy |
| Shanmukhapriya | Easy |
| Rasikapriya | Medium |
| Nātakapriya | Hard |
| Varunapriya | Hard |
| Bhavapriya | Hard |
| Rishabhapriya | Hard |

**Pool size:** 7
**Reveal text:** *"Every raga you just sang has 'priya' (beloved) in its name."*

---

### Theme 2 — The "Kalyāni" Family
**Dimension:** Name suffix — every raga name contains *"kalyāni"*

| Raga | Tier |
|------|------|
| Mechakalyāni | Easy |
| Hamirkalyāni | Easy |
| Mohanakalyāni | Easy |
| Yamunākalyāni | Easy |
| Pūrvikalyāni | Easy |
| Kalyāna Vasantham | Medium |

**Pool size:** 6
**Reveal text:** *"Six faces of Kalyāni — all named after the same beloved scale."*

---

### Theme 3 — Children of Shankarābharanam (Mela 29)
**Dimension:** Parent mela — all active janya ragas of Mela 29 (Dhīrashankarābharanam)

| Raga | Tier |
|------|------|
| Arabhi | Easy |
| Bilāhari | Easy |
| Hamsadhvani | Easy |
| Bēhāg | Easy |
| Nīlāmbari | Easy |
| Kēdhāram | Easy |
| Suddha Sāvēri | Medium |
| Dhēvagāndhāri | Medium |
| Mānd | Medium |
| Hindusthāni Bēhāg | Medium |
| Kurānji | Medium |
| Pūrnachandhrika | Medium |
| Janaranjani | Hard |
| Kannada | Hard |
| Navaroj | Hard |
| Bangāla | Hard |

**Pool size:** 16
**Reveal text:** *"Same 7 svaras as Shankarābharanam (Mela 29) — completely different personalities."*

---

### Theme 4 — Children of Kharaharapriya (Mela 22)
**Dimension:** Parent mela — all active janya ragas of Mela 22 (Kharaharapriya)

| Raga | Tier |
|------|------|
| Ābhēri | Easy |
| Abhōgi | Easy |
| Brindāvanasāranga | Easy |
| Bāgēshri | Easy |
| Madhyamāvathi | Easy |
| Shrīrāga | Easy |
| Hindusthāni Kāpi | Easy |
| Mukhāri | Medium |
| Dharbāru | Medium |
| Shrīranjani | Medium |
| Husēni | Medium |

**Pool size:** 11
**Reveal text:** *"Siblings that sound nothing alike — all share the parent scale Kharaharapriya (Mela 22)."*

---

### Theme 5 — The Pentatonic Club
**Dimension:** Svara count — ragas with exactly 5 svaras in both arohanam and avarohanam (audava-audava)

| Raga | Tier |
|------|------|
| Hindolam | Easy |
| Abhōgi | Easy |
| Mohana | Easy |
| Hamsadhvani | Easy |
| Madhyamāvathi | Easy |
| Ābhēri | Easy |
| Amruthavarshini | Easy |

**Pool size:** 7
**Reveal text:** *"Every raga in this session uses exactly 5 notes."*

---

### Theme 6 — The Sharp Fourth (Prathi Madhyamam)
**Dimension:** Svara identity — all ragas that use tivra madhyamam (M2, the sharp 4th). All come from Melakartas 37–72.

| Raga | Tier |
|------|------|
| Mechakalyāni | Easy |
| Kāmavardhini | Easy |
| Vāchaspathi | Easy |
| Pūrvikalyāni | Easy |
| Hamirkalyāni | Easy |
| Mohanakalyāni | Easy |
| Yamunākalyāni | Easy |
| Amruthavarshini | Easy |
| Shanmukhapriya | Easy |
| Simhendra Madhyamam | Medium |
| Hemāvathi | Medium |
| Dharmāvathi | Medium |
| Hamsānandhi | Medium |
| Madhuvanthi | Medium |
| Ranjani | Medium |
| Sāranga | Medium |
| Varāli | Medium |

**Pool size:** 17
**Reveal text:** *"Every raga you sang uses the sharp fourth (tivra Ma) — that distinctive lift in the scale."*

---

### Theme 7 — The Bhairavi Clan
**Dimension:** Name suffix — every raga name ends in *"bhairavi"*

| Raga | Tier |
|------|------|
| Bhairavi | Easy |
| Ānandabhairavi | Easy |
| Sindhu Bhairavi | Easy |
| Natabhairavi | Medium |

**Pool size:** 4
**Reveal text:** *"All roads lead to Bhairavi — four ragas, one ancient name."*

---

### Theme 8 — The Hindustani Visitors
**Dimension:** Origin — Carnatic ragas borrowed or derived from Hindustani musical tradition

| Raga | Tier |
|------|------|
| Bēhāg | Easy |
| Hindusthāni Kāpi | Easy |
| Bāgēshri | Easy |
| Mānd | Medium |
| Hindusthāni Bēhāg | Medium |
| Husēni | Medium |
| Dharbāru | Medium |

**Pool size:** 7
**Reveal text:** *"Every raga in this session crossed the Vindhyas — all have Hindustani roots."*

---

### Theme 9 — The Atlas
**Dimension:** Name origin — ragas named after places, regions, and rivers

| Raga | Named after | Tier |
|------|------------|------|
| Kēdhāram | Kedara (sacred peak, Himalayas) | Easy |
| Sindhu Bhairavi | Sindhu (Indus river) | Easy |
| Kannada | Karnataka region | Hard |
| Bangāla | Bengal region | Hard |
| Gujjari | Gujarat / Gujar people | Hard |
| Kosalam | Kosala kingdom (ancient South India) | Hard |
| Pharaz | Persia / Persian | Hard |
| Sindhu Rāmakriya | Sindhu (Indus river) | Hard |

**Pool size:** 8
**Reveal text:** *"A musical map — every raga in this session is named after a place."*

---

### Theme 10 — The Zoo
**Dimension:** Name contains a bird or animal — Hamsa (swan), Kōkila (cuckoo), Simha (lion), Nāga (serpent)

| Raga | Creature | Tier |
|------|---------|------|
| Hamsadhvani | Hamsa — swan | Easy |
| Hamsānandhi | Hamsa — swan | Medium |
| Simhendra Madhyamam | Simha — lion | Medium |
| Nāgasvarāvali | Nāga — serpent | Medium |
| Kōkilapriya | Kōkila — cuckoo | Hard |

**Pool size:** 5
**Reveal text:** *"Swan, cuckoo, lion, serpent — every raga in this session is named after a creature."*

---

### Theme 11 — Cosmic Light Show
**Dimension:** Name contains celestial or light imagery — Chandhra (moon), Sūrya (sun), Jyothi (light)

| Raga | Meaning | Tier |
|------|---------|------|
| Pūrnachandhrika | Full moonlight | Medium |
| Jyothisvarūpini | Form of light | Medium |
| Sūryakāntam | Beloved of the sun | Hard |
| Chandhrajyothi | Moonlight | Hard |

**Pool size:** 4
**Reveal text:** *"Sun, moon, and light — every raga carries a celestial name."*

---

### Theme 12 — The Varāli Family
**Dimension:** Name suffix — every raga name ends in *"varāli"*

| Raga | Tier |
|------|------|
| Varāli | Medium |
| Punnāgavarāli | Medium |
| Shubhapanthuvarāli | Medium |
| Kunthalavarāli | Medium |

**Pool size:** 4
**Reveal text:** *"Four variations on one haunting scale — the Varāli family."*

---

## Theme Summary

| # | Name | Dimension | Pool size |
|---|------|-----------|-----------|
| 1 | The "Priya" Family | Name suffix "-priya" | 7 |
| 2 | The "Kalyāni" Family | Name contains "kalyāni" | 6 |
| 3 | Children of Shankarābharanam | Parent mela 29 | 16 |
| 4 | Children of Kharaharapriya | Parent mela 22 | 11 |
| 5 | The Pentatonic Club | 5-svara ragas (audava) | 7 |
| 6 | The Sharp Fourth | Uses M2 / tivra Ma | 17 |
| 7 | The Bhairavi Clan | Name suffix "-bhairavi" | 4 |
| 8 | The Hindustani Visitors | Hindustani origin | 7 |
| 9 | The Atlas | Named after places | 8 |
| 10 | The Zoo | Named after creatures | 5 |
| 11 | Cosmic Light Show | Celestial names | 4 |
| 12 | The Varāli Family | Name suffix "-varāli" | 4 |

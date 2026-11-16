/**
 * Sportarten mit MET-Richtwerten (metabolisches Äquivalent) nach dem „Compendium of Physical Activities“ (Ainsworth
 * u. a., 2011), gerundet. Der Verbrauch ist eine Schätzung – Tempo, Gelände und Fitness machen viel aus.
 */
export interface ActivityType {
  key: string
  name: string
  emoji: string
  /** MET-Richtwert; 0 bei Schritten und eigenen Einträgen */
  met: number
  aliases?: string[]
  /** Wird über Schritte statt Minuten erfasst */
  steps?: boolean
  /** Eigene Aktivität: Name und kcal selbst eintragen */
  custom?: boolean
}

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  { key: 'schritte', name: 'Schritte', emoji: '👣', met: 0, steps: true, aliases: ['Schrittzähler', 'Gehen'] },
  { key: 'spazieren', name: 'Spazierengehen', emoji: '🚶', met: 3, aliases: ['Spaziergang', 'Gassi gehen', 'Gehen'] },
  { key: 'walking', name: 'Zügiges Gehen / Walking', emoji: '🚶‍♀️', met: 4.3, aliases: ['Walken', 'Power Walking'] },
  { key: 'nordic-walking', name: 'Nordic Walking', emoji: '🥢', met: 4.8 },
  { key: 'wandern', name: 'Wandern', emoji: '🥾', met: 6, aliases: ['Bergwandern', 'Trekking'] },
  { key: 'joggen', name: 'Joggen (ca. 8 km/h)', emoji: '🏃', met: 8, aliases: ['Laufen', 'Jogging', 'Running'] },
  { key: 'laufen-schnell', name: 'Laufen schnell (ca. 11 km/h)', emoji: '🏃‍♂️', met: 11, aliases: ['Intervalllauf', 'Tempolauf'] },
  { key: 'rad-gemuetlich', name: 'Radfahren gemütlich', emoji: '🚲', met: 4, aliases: ['Fahrrad', 'Rad', 'Radfahren', 'E-Bike'] },
  { key: 'rad-zuegig', name: 'Radfahren zügig', emoji: '🚴', met: 8, aliases: ['Rennrad'] },
  { key: 'mountainbike', name: 'Mountainbike', emoji: '🚵', met: 8.5, aliases: ['MTB'] },
  { key: 'indoor-cycling', name: 'Ergometer / Indoor-Cycling', emoji: '🚴‍♀️', met: 7, aliases: ['Spinning', 'Heimtrainer', 'Ergometer'] },
  { key: 'schwimmen', name: 'Schwimmen', emoji: '🏊', met: 6, aliases: ['Bahnen schwimmen', 'Kraulen', 'Brustschwimmen'] },
  { key: 'aquafitness', name: 'Aquafitness', emoji: '🌊', met: 5.3, aliases: ['Aquajogging', 'Wassergymnastik'] },
  { key: 'krafttraining', name: 'Krafttraining', emoji: '🏋️', met: 5, aliases: ['Fitnessstudio', 'Gym', 'Gewichte', 'Bodybuilding'] },
  { key: 'hiit', name: 'HIIT / Zirkeltraining', emoji: '🔥', met: 8, aliases: ['Crossfit', 'Bootcamp', 'Tabata', 'Workout'] },
  { key: 'crosstrainer', name: 'Crosstrainer', emoji: '⚙️', met: 5, aliases: ['Ellipsentrainer'] },
  { key: 'rudern', name: 'Rudern (Gerät)', emoji: '🚣', met: 7, aliases: ['Rudergerät', 'Rudern'] },
  { key: 'yoga', name: 'Yoga', emoji: '🧘', met: 2.5 },
  { key: 'pilates', name: 'Pilates', emoji: '🤸', met: 3 },
  { key: 'dehnen', name: 'Dehnen / Mobility', emoji: '🙆', met: 2.3, aliases: ['Stretching', 'Gymnastik'] },
  { key: 'tanzen', name: 'Tanzen', emoji: '💃', met: 5, aliases: ['Zumba', 'Tanzkurs'] },
  { key: 'fussball', name: 'Fußball', emoji: '⚽', met: 7, aliases: ['Kicken'] },
  { key: 'basketball', name: 'Basketball', emoji: '🏀', met: 6.5 },
  { key: 'handball', name: 'Handball', emoji: '🤾', met: 8 },
  { key: 'volleyball', name: 'Volleyball', emoji: '🏐', met: 4, aliases: ['Beachvolleyball'] },
  { key: 'tennis', name: 'Tennis', emoji: '🎾', met: 7.3 },
  { key: 'badminton', name: 'Badminton', emoji: '🏸', met: 5.5, aliases: ['Federball'] },
  { key: 'tischtennis', name: 'Tischtennis', emoji: '🏓', met: 4, aliases: ['Ping Pong'] },
  { key: 'squash', name: 'Squash', emoji: '🎾', met: 7.3 },
  { key: 'klettern', name: 'Klettern / Bouldern', emoji: '🧗', met: 7.5, aliases: ['Bouldern', 'Kletterhalle'] },
  { key: 'kampfsport', name: 'Kampfsport / Boxen', emoji: '🥊', met: 7.8, aliases: ['Boxen', 'Karate', 'Judo', 'Kickboxen'] },
  { key: 'inlineskaten', name: 'Inlineskaten', emoji: '🛼', met: 7.5, aliases: ['Skaten', 'Rollschuh'] },
  { key: 'skifahren', name: 'Skifahren', emoji: '⛷️', met: 7, aliases: ['Ski', 'Snowboard'] },
  { key: 'langlauf', name: 'Skilanglauf', emoji: '🎿', met: 9, aliases: ['Langlauf'] },
  { key: 'reiten', name: 'Reiten', emoji: '🏇', met: 5.5 },
  { key: 'seilspringen', name: 'Seilspringen', emoji: '🪢', met: 11, aliases: ['Springseil'] },
  { key: 'treppen', name: 'Treppensteigen', emoji: '🪜', met: 8, aliases: ['Treppen', 'Stepper'] },
  { key: 'sup', name: 'Stand-up-Paddling', emoji: '🏄', met: 6, aliases: ['SUP', 'Paddeln', 'Kajak', 'Kanu'] },
  { key: 'golf', name: 'Golf (zu Fuß)', emoji: '⛳', met: 4.8 },
  { key: 'garten', name: 'Gartenarbeit', emoji: '🌱', met: 3.8, aliases: ['Rasen mähen', 'Umgraben'] },
  { key: 'putzen', name: 'Hausputz', emoji: '🧹', met: 3.3, aliases: ['Putzen', 'Haushalt', 'Staubsaugen'] },
  { key: 'eigene', name: 'Eigene Aktivität', emoji: '✨', met: 0, custom: true },
]

/** Die häufigsten zuerst – als Schnellauswahl */
export const QUICK_ACTIVITY_KEYS = ['spazieren', 'joggen', 'rad-gemuetlich', 'krafttraining', 'schwimmen', 'yoga', 'schritte', 'eigene'] as const

export function activityType(key: string): ActivityType | undefined {
  return ACTIVITY_TYPES.find((a) => a.key === key)
}

class Child {
  final String id;
  final String familyId;
  final String name;
  final String avatar;
  final int birthYear;
  int points;
  int readingStreak;
  int daysSinceLastReading;
  final String createdAt;
  int version; // pentru conflict resolution

  Child({
    required this.id,
    required this.familyId,
    required this.name,
    this.avatar = '🐶',
    required this.birthYear,
    this.points = 0,
    this.readingStreak = 0,
    this.daysSinceLastReading = 0,
    this.createdAt = '',
    this.version = 1,
  });

  Map<String, dynamic> toMap() => {
    'id': id, 'family_id': familyId, 'name': name, 'avatar': avatar,
    'birth_year': birthYear, 'points': points, 'reading_streak': readingStreak,
    'days_since_last_reading': daysSinceLastReading, 'version': version,
  };

  factory Child.fromMap(Map<String, dynamic> map) => Child(
    id: map['id'] ?? '',
    familyId: map['family_id'] ?? '',
    name: map['name'] ?? '',
    avatar: map['avatar'] ?? '🐶',
    birthYear: map['birth_year'] ?? 2016,
    points: map['points'] ?? 0,
    readingStreak: map['reading_streak'] ?? 0,
    daysSinceLastReading: map['days_since_last_reading'] ?? 0,
    version: map['version'] ?? 1,
  );
}

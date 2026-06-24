class Activity {
  final String id;
  final String childId;
  final String familyId;
  final String title;
  final String? description;
  final String type;
  String status; // pending, completed, approved
  final int points;
  final String? photoUrl;
  final int version;
  final String createdAt;
  final String? completedAt;

  Activity({
    required this.id,
    required this.childId,
    required this.familyId,
    required this.title,
    this.description,
    this.type = 'chore',
    this.status = 'pending',
    this.points = 0,
    this.photoUrl,
    this.version = 1,
    this.createdAt = '',
    this.completedAt,
  });

  Map<String, dynamic> toMap() => {
    'id': id, 'child_id': childId, 'family_id': familyId,
    'title': title, 'description': description, 'type': type,
    'status': status, 'points': points, 'photo_url': photoUrl,
    'version': version,
  };

  factory Activity.fromMap(Map<String, dynamic> map) => Activity(
    id: map['id'] ?? '',
    childId: map['child_id'] ?? '',
    familyId: map['family_id'] ?? '',
    title: map['title'] ?? '',
    description: map['description'],
    type: map['type'] ?? 'chore',
    status: map['status'] ?? 'pending',
    points: map['points'] ?? 0,
    photoUrl: map['photo_url'],
    version: map['version'] ?? 1,
    createdAt: map['created_at'] ?? '',
    completedAt: map['completed_at'],
  );
}

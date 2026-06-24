import 'dart:convert';

class SyncAction {
  final String id;
  final String action;
  final Map<String, dynamic> payload;
  final int version;
  final String createdAt;

  SyncAction({
    required this.id,
    required this.action,
    required this.payload,
    this.version = 1,
    this.createdAt = '',
  });

  Map<String, dynamic> toMap() => {
    'id': id, 'action': action, 'payload': jsonEncode(payload),
    'version': version, 'created_at': createdAt,
  };

  factory SyncAction.fromMap(Map<String, dynamic> map) => SyncAction(
    id: map['id'] as String,
    action: map['action'] as String,
    payload: jsonDecode(map['payload'] as String) as Map<String, dynamic>,
    version: map['version'] as int? ?? 1,
    createdAt: map['created_at'] as String? ?? '',
  );
}

import 'package:flutter/material.dart';

class NumberChip extends StatelessWidget {
  final String number;
  final String? note;

  const NumberChip({super.key, required this.number, this.note});

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(
        note == null ? number : '$number • $note',
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
      ),
    );
  }
}

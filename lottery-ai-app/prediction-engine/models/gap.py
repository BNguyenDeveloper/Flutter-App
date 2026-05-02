from .common import all_numbers

def gap_score(history):
    numbers = all_numbers()
    last_seen_gap = {n: None for n in numbers}
    newest_first = list(reversed(history))

    for gap, item in enumerate(newest_first):
        for number in item.get("twoDigits", []):
            if number in last_seen_gap and last_seen_gap[number] is None:
                last_seen_gap[number] = gap

    raw = {}
    for number, gap in last_seen_gap.items():
        raw[number] = 1.0 if gap is None else min(gap / 30.0, 1.0)
    return raw

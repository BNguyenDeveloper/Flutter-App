def all_numbers():
    return [str(i).zfill(2) for i in range(100)]

def normalize(score_map):
    if not score_map:
        return {}
    max_value = max(score_map.values()) or 1
    return {k: min(max(v / max_value, 0), 1) for k, v in score_map.items()}

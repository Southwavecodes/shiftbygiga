from rotation_logic import generate_weekly_roster

class MockStaff:
    def __init__(self, id, name):
        self.id = id
        self.name = name

def test_rotation():
    staff_list = [MockStaff(i, f"P{i+1}") for i in range(33)]
    
    print("--- Week 1 ---")
    w1 = generate_weekly_roster(staff_list, 1)
    sunday_ids = [s.id for s in w1['sunday']]
    print(f"Sunday Team IDs: {sunday_ids}")
    # Sunday team: 0, 1, 2, 3, 4 (Consecutive from start 0)
    assert sunday_ids == [0, 1, 2, 3, 4]
    
    print("--- Week 2 ---")
    w2 = generate_weekly_roster(staff_list, 2)
    sunday_ids_w2 = [s.id for s in w2['sunday']]
    print(f"Sunday Team IDs: {sunday_ids_w2}")
    # Start index: (2-1)*5 = 5. Sunday team: 5, 6, 7, 8, 9
    assert sunday_ids_w2 == [5, 6, 7, 8, 9]
    
    print("--- Week 7 (Overflow Check) ---")
    # Start index: (7-1)*5 = 30. Sunday: 30, 31, 32, 0, 1
    w7 = generate_weekly_roster(staff_list, 7)
    sunday_ids_w7 = [s.id for s in w7['sunday']]
    print(f"Sunday Team IDs: {sunday_ids_w7}")
    assert sunday_ids_w7 == [30, 31, 32, 0, 1]

    print("\nRotation Logic Validated successfully!")

if __name__ == "__main__":
    test_rotation()

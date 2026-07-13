import Std.Tactic

/-- The sum of the first `n` odd numbers, defined recursively. -/
def oddSum : Nat -> Nat
  | 0 => 0
  | n + 1 => oddSum n + (2 * n + 1)

/-- The sum of the first `n` odd numbers is `n^2`. -/
theorem oddSum_eq_square : forall n : Nat, oddSum n = n * n
  | 0 => rfl
  | n + 1 => by
      rw [oddSum, oddSum_eq_square]
      simp [Nat.mul_add, Nat.mul_two, Nat.add_assoc, Nat.mul_comm]

#print axioms oddSum_eq_square

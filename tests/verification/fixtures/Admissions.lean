theorem bySorry : True := by sorry
theorem byAdmit : True := by admit
def interpolatedAdmission : String := s!"{(by sorry : Nat)}"
#print axioms bySorry
#print axioms byAdmit
#print axioms interpolatedAdmission

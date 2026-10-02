theorem extensionality (a b : Prop) (h : a ↔ b) : a = b := propext h
noncomputable def chosen (a : Type) (h : Nonempty a) : a := Classical.choice h
theorem quotientEquality {a : Type} {r : a → a → Prop} (x y : a) (h : r x y) : Quot.mk r x = Quot.mk r y := Quot.sound h
#print axioms extensionality
#print axioms chosen
#print axioms quotientEquality

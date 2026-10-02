/- outer /- nested -/ sorry admit -/
def prose : String := "escaped quote: \" sorry admit -- /-"
def rawProse : String := r##"sorry " admit /- --"##
def char : Char := 's'
def sorry' : Nat := 1
def sorry₁ : Nat := 1
def sorry℀ : Nat := 1
def «sorry» : Nat := 1
theorem valid : True := True.intro
-- #print axioms imaginary
def fakeAudit : String := "#print axioms imaginary"
#print /- comment /- nested -/ -/ axioms valid -- trailing comment

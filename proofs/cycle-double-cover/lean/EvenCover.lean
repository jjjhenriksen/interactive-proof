/-! Display excerpts; see `verification.json` for verification status. -/

noncomputable def cubic_even_double_cover
    (G : CubicGraph V E) (f : GammaFlow G) : IndexedEvenDoubleCover G := by
  let P := cubic_labeling G f
  refine
    { member := fun s e ↦ pairIndicator (P.base e) (f.val e) s
      vertexEven := ?_
      coveredTwice := ?_ }
  · intro s v
    exact P.vertexParity v s
  · intro e
    exact pairIndicator_card (P.base e) (f.val e) (f.nowhereZero e)

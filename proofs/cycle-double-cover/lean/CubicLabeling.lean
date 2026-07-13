/-! Display excerpts; see `verification.json` for verification status. -/

/-- The finite local parity fact used at a cubic vertex. -/
theorem local_pair_parity :
    ∀ (x y t s : Gamma),
      x ≠ 0 → y ≠ 0 → x ≠ y →
      pairIndicator t x s +
      pairIndicator (t + x) y s +
      pairIndicator t (x + y) s = 0 := by
  decide

theorem compatibility_solvable
    (G : CubicGraph V E) (f : GammaFlow G) :
    compatibilityRhs G f ∈ LinearMap.range (compatibilityMap G f) := by
  apply mem_range_of_dual_obstructions_vanish
  intro φ hφ
  let η : E → Module.Dual F₂ Gamma := coordinateFunctional φ
  -- Local constraints on η are derived here.
  -- The local dual identity turns each vertex term into a parity count.
  simp_rw [hcontrib, hlocal]
  rw [← G.sum_edgeEnds_eq_sum_vertexSlots
    (fun e _ ↦ functionalNonzero (η e))]
  simp [show (2 : F₂) = 0 by decide]

noncomputable def cubic_labeling
    (G : CubicGraph V E) (f : GammaFlow G) : CubicLabeling G f := by
  let x := Classical.choose (compatibility_solvable G f)
  have hx : compatibilityMap G f x = compatibilityRhs G f := by
    simpa [x] using Classical.choose_spec (compatibility_solvable G f)
  let t : V → Gamma := x.1
  let ε : E → F₂ := x.2
  let p : E → Gamma := fun e ↦
    t (G.endAt e 0) + localBase G f (G.endAt e 0) e
  -- Endpoint agreement and vertex parity follow.
  refine ⟨p, ?_⟩
  intro v s
  -- Reduced to local_pair_parity.
  exact local_pair_parity _ _ _ _ ‹_› ‹_› ‹_›

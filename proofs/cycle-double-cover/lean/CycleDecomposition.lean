/-! Display excerpts; see `verification.json` for verification status. -/

theorem decompose_even_edge_set
    (F : Finset E) (hF : G.IsEvenEdgeSet F) :
    ∃ L : List G.Cycle, ∀ e : E,
      (L.filter fun C ↦ e ∈ C.edges).length = if e ∈ F then 1 else 0 := by
  classical
  revert hF
  refine Finset.strongInductionOn F ?_
  intro F ih hF
  by_cases hne : F.Nonempty
  · by_cases hmin : ∀ D, D.Nonempty → D ⊆ F → G.IsEvenEdgeSet D → D = F
    · -- F itself is a minimal even set: one cycle.
      exact ⟨[⟨F, hne, hF, hmin⟩], by simp⟩
    · -- Split off a smaller even set and recurse.
      obtain ⟨D, hDne, hDF, hDeven, hDproper⟩ := hmin
      -- Inductive bookkeeping continues in the full source.
  · exact ⟨[], by simp_all⟩

noncomputable def IndexedEvenDoubleCover.toCycleDoubleCover
    (C : G.IndexedEvenDoubleCover) : G.CycleDoubleCover := by
  classical
  have hex : ∀ s : Gamma, ∃ L : List G.Cycle,
      ∀ e : E, (L.filter fun Z ↦ e ∈ Z.edges).length =
        if e ∈ C.support G s then 1 else 0 := by
    intro s
    exact G.decompose_even_edge_set _ (C.support_even G s)
  choose pieces hpieces using hex
  refine { cycles := Finset.univ.toList.flatMap pieces, coveredTwice := ?_ }
  intro e
  simpa [C.support] using C.coveredTwice e

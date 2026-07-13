/-!
Display excerpts from the referenced formalization.

These declarations are educational excerpts preserved from the original interactive
prototype. This directory is not currently a standalone Lake project; see
`verification.json` before interpreting build status.
-/

/-- Every finite bridgeless graph has a cycle double cover. -/
theorem cycleDoubleCover_of_bridgeless
    {V E : Type u} [Fintype V] [Fintype E]
    [DecidableEq V] [DecidableEq E]
    (G : FiniteGraph V E) (hb : G.Bridgeless) :
    Nonempty G.CycleDoubleCover := by
  let R : G.RotationSystem := G.rotationSystemOfBridgeless hb
  let K : CubicGraph G.ExpandedVertex G.ExpandedEdge := G.cubicExpansion R
  have hK : K.toFiniteGraph.Bridgeless := by
    simpa [K] using G.cubicExpansion_bridgeless R hb
  obtain ⟨gamma⟩ := K.toFiniteGraph.jaegerKilpatrickEightFlow hK
  exact cycleDoubleCover_of_gammaFlow G R gamma

/-- A nowhere-zero Gamma-flow on a cubic expansion supplies a cycle double cover. -/
theorem cycleDoubleCover_of_gammaFlow
    (G : FiniteGraph V E) (R : G.RotationSystem)
    (gamma : (G.cubicExpansion R).toFiniteGraph.NowhereZeroFlow Gamma) :
    Nonempty G.CycleDoubleCover := by
  let K := G.cubicExpansion R
  let cubicCover := cubic_even_double_cover K (K.gammaFlowOfNowhereZero gamma)
  let projected := G.projectEvenDoubleCover R cubicCover
  exact ⟨projected.toCycleDoubleCover⟩

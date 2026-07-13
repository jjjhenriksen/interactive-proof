import evaluationCases from "../../evals/cases.json";
import evaluationResults from "../../evals/results.json";

import { evaluationResultsSchema, evaluationSetSchema } from "./schema";

export const publicEvaluationSet = evaluationSetSchema.parse(evaluationCases);
export const publicEvaluationResults = evaluationResultsSchema.parse(evaluationResults);

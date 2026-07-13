"use client"

import { type FormEvent, useState } from "react"

import styles from "./explanation-panel.module.css"

const MAX_QUESTION_LENGTH = 800

type FollowUpFormProps = {
  onSubmit: (question: string) => void
  isBusy?: boolean
}

export function FollowUpForm({ onSubmit, isBusy = false }: FollowUpFormProps) {
  const [question, setQuestion] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isBusy) return

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      setError("Enter a question about this selection.")
      return
    }

    setError(null)
    onSubmit(trimmedQuestion)
    setQuestion("")
  }

  return (
    <form className={styles.followUpForm} onSubmit={handleSubmit} noValidate>
      <label className={styles.followUpLabel} htmlFor="explanation-follow-up">
        Ask a follow-up about this selection
      </label>
      <div className={styles.followUpRow}>
        <input
          id="explanation-follow-up"
          className={styles.followUpInput}
          type="text"
          value={question}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder="Ask about this step…"
          autoComplete="off"
          aria-describedby={error ? "explanation-follow-up-error" : undefined}
          aria-invalid={Boolean(error)}
          disabled={isBusy}
          onChange={(event) => {
            setQuestion(event.target.value)
            if (error) setError(null)
          }}
        />
        <button className={styles.submitButton} type="submit" disabled={isBusy}>
          {isBusy ? "Answering…" : "Ask"}
        </button>
      </div>
      {error ? (
        <p className={styles.formError} id="explanation-follow-up-error" role="alert">
          <span aria-hidden="true">!</span> {error}
        </p>
      ) : null}
    </form>
  )
}

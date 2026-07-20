"use client"

import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
} from "react"

import {
  EXPLANATION_ACTIONS,
  type ExplanationMode,
  type SupportedSelection,
} from "./selection-types"
import styles from "./selection-menu.module.css"

type SelectionMenuProps = {
  selection: SupportedSelection
  onAction: (mode: ExplanationMode, selection: SupportedSelection) => void
  onDismiss: () => void
  autoFocus?: boolean
}

type MenuPosition = CSSProperties & {
  "--selection-center-x": string
  "--selection-bottom-y": string
}

export function SelectionMenu({
  selection,
  onAction,
  onDismiss,
  autoFocus = true,
}: SelectionMenuProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])
  const position = useMemo<MenuPosition>(
    () => ({
      "--selection-center-x": `${(selection.clientRect.left + selection.clientRect.right) / 2}px`,
      "--selection-bottom-y": `${selection.clientRect.bottom}px`,
    }),
    [selection.clientRect],
  )

  useLayoutEffect(() => {
    if (autoFocus) itemRefs.current[0]?.focus()
  }, [autoFocus, selection])

  useLayoutEffect(() => {
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!itemRefs.current.some((item) => item?.contains(target))) onDismiss()
    }

    document.addEventListener("pointerdown", handleOutsidePointer)
    return () => document.removeEventListener("pointerdown", handleOutsidePointer)
  }, [onDismiss])

  useEffect(() => {
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      onDismissRef.current()
    }

    document.addEventListener("keydown", handleDocumentKeyDown, true)
    window.addEventListener("keydown", handleDocumentKeyDown, true)
    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown, true)
      window.removeEventListener("keydown", handleDocumentKeyDown, true)
    }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = itemRefs.current.findIndex(
      (item) => item === document.activeElement,
    )
    let nextIndex: number | undefined

    if (event.key === "Escape") {
      event.preventDefault()
      onDismiss()
      return
    }
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = EXPLANATION_ACTIONS.length - 1
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (Math.max(0, currentIndex) + 1) % EXPLANATION_ACTIONS.length
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex =
        (currentIndex - 1 + EXPLANATION_ACTIONS.length) %
        EXPLANATION_ACTIONS.length
    }

    if (nextIndex !== undefined) {
      event.preventDefault()
      itemRefs.current[nextIndex]?.focus()
    }
  }

  return (
    <div
      className={styles.menu}
      style={position}
      role="toolbar"
      aria-label="Explain selected passage"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
    >
      <p className={styles.mobileHeading}>Explain this selection</p>
      <div className={styles.actions}>
        {EXPLANATION_ACTIONS.map((action, index) => (
          <button
            className={styles.action}
            key={action.mode}
            type="button"
            aria-label={action.label}
            ref={(element) => {
              itemRefs.current[index] = element
            }}
            onClick={() => onAction(action.mode, selection)}
          >
            <span className={styles.longLabel}>{action.label}</span>
            <span className={styles.shortLabel}>{action.shortLabel}</span>
          </button>
        ))}
      </div>
      <button className={styles.dismiss} type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  )
}

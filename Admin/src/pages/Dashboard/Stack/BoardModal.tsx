import React, { useRef, useState } from "react";
import classnames from "classnames";
import { Modal } from "reactstrap";

interface BoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: string;
  submitLabel: string;
  canSubmit: boolean;
  isBusy?: boolean;
  /** Says what is still missing while the submit button is disabled. */
  hint?: string;
  onSubmit: () => void;
  children: React.ReactNode;
}

/** The shared card for adding things on the Stack board, in the board's own dark style. */
export const BoardModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  submitLabel,
  canSubmit,
  isBusy,
  hint,
  onSubmit,
  children,
}: BoardModalProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      centered
      scrollable
      autoFocus={false}
      onOpened={() =>
        formRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus()
      }
      className="tm-modal"
      contentClassName="tm-modal__card"
    >
      <form
        ref={formRef}
        className="tm-modal__form"
        onSubmit={event => {
          event.preventDefault();
          if (canSubmit && !isBusy) onSubmit();
        }}
      >
        <div className="tm-modal__head">
          <span className="tm-modal__icon" aria-hidden="true">
            <i className={icon} />
          </span>
          <div className="tm-modal__heading">
            <h2 className="tm-modal__title">{title}</h2>
            {subtitle && <p className="tm-modal__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="tm-modal__close" aria-label="Close" onClick={onClose}>
            <i className="bx bx-x" />
          </button>
        </div>
        <div className="tm-modal__body">{children}</div>
        <div className="tm-modal__foot">
          <span className="tm-modal__hint">{canSubmit ? "" : hint}</span>
          <button type="button" className="tm-modal__btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="tm-modal__btn is-primary" disabled={!canSubmit || isBusy}>
            {isBusy ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export type PickerPerson = {
  id: number;
  name: string;
  image?: string;
  note?: string;
};

const AVATAR_COLORS = ["#594ded", "#3b78f5", "#22bd73", "#f5bd4f", "#fc736f"];

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "?";

interface PersonPickerProps {
  label: string;
  people: PickerPerson[];
  value: number | "";
  onChange: (value: number | "") => void;
  /** Adds an "Unassigned" row. */
  allowNone?: boolean;
  emptyText?: string;
  headerAction?: React.ReactNode;
}

export const PersonPicker = ({
  label,
  people,
  value,
  onChange,
  allowNone,
  emptyText,
  headerAction,
}: PersonPickerProps) => {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const shown = people.filter(person => person.name.toLowerCase().includes(term));
  const radioName = `tm-person-${label}`;

  return (
    <div className="tm-modal__field">
      <div className="tm-modal__label-row">
        <span className="tm-modal__label">{label}</span>
        {headerAction}
      </div>
      {people.length > 5 && (
        <div className="tm-modal__search">
          <i className="bx bx-search" />
          <input
            type="text"
            placeholder="Search"
            aria-label={`Search ${label.toLowerCase()}`}
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
      )}
      <ul className="tm-modal__people" role="radiogroup" aria-label={label}>
        {allowNone && !term && (
          <li>
            <label className={classnames("tm-modal__person", { "is-selected": value === "" })}>
              <input
                type="radio"
                name={radioName}
                checked={value === ""}
                onChange={() => onChange("")}
              />
              <span className="tm-modal__avatar tm-modal__avatar--none">
                <i className="bx bx-user" />
              </span>
              <span className="tm-modal__person-name">Unassigned</span>
              <span className="tm-modal__radio" aria-hidden="true" />
            </label>
          </li>
        )}
        {shown.map((person, index) => (
          <li key={person.id}>
            <label className={classnames("tm-modal__person", { "is-selected": value === person.id })}>
              <input
                type="radio"
                name={radioName}
                checked={value === person.id}
                onChange={() => onChange(person.id)}
              />
              {person.image ? (
                <img src={person.image} alt="" className="tm-modal__avatar" />
              ) : (
                <span
                  className="tm-modal__avatar"
                  style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                >
                  {initialsOf(person.name)}
                </span>
              )}
              <span className="tm-modal__person-text">
                <span className="tm-modal__person-name">{person.name}</span>
                {person.note && <span className="tm-modal__person-note">{person.note}</span>}
              </span>
              <span className="tm-modal__radio" aria-hidden="true" />
            </label>
          </li>
        ))}
        {people.length === 0 && !allowNone && emptyText && (
          <li className="tm-modal__empty">{emptyText}</li>
        )}
        {people.length > 0 && term && shown.length === 0 && (
          <li className="tm-modal__empty">Nobody matches “{search.trim()}”.</li>
        )}
      </ul>
    </div>
  );
};

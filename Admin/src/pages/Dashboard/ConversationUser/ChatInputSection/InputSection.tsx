import React from "react";

import { Input } from "reactstrap";

interface InputSectionProps {
  value: null | string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onCaretChange?: (position: number) => void;
}

const InputSection = ({
  value,
  onChange,
  disabled,
  placeholder,
  inputRef,
  onKeyDown,
  onCaretChange,
}: InputSectionProps) => {
  // console.log("value",value)
  return (
    <div className="position-relative">
      <Input
        type="text"
        className="form-control form-control-lg chat-input"
        id="chat-input"
        placeholder={placeholder || "Type your message..."}
        value={value || ""}
        disabled={!!disabled}
        innerRef={inputRef}
        onChange={(e: any) => {
          onChange(e.target.value);
          onCaretChange?.(e.target.selectionStart ?? e.target.value.length);
        }}
        onSelect={(e: any) => onCaretChange?.(e.target.selectionStart ?? 0)}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
    </div>
  );
};
export default InputSection;

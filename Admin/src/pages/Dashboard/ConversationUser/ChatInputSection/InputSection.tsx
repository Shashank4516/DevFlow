import React from "react";

import { Input } from "reactstrap";

interface InputSectionProps {
  value: null | string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const InputSection = ({ value, onChange, disabled, placeholder }: InputSectionProps) => {
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
        onChange={(e: any) => {
          onChange(e.target.value);
        }}
        autoComplete="off"
      />
    </div>
  );
};
export default InputSection;

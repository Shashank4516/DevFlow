import React, { useState } from "react";

import {
  getSoundSettings,
  playSendSound,
  saveSoundSettings,
  SoundSettings,
} from "../../../helpers/chatSounds";

const ROWS: { key: keyof SoundSettings; label: string; hint: string }[] = [
  { key: "messages", label: "Message sounds", hint: "When you send or receive a message" },
];

const Sounds = () => {
  const [settings, setSettings] = useState<SoundSettings>(getSoundSettings);

  const onChange = (key: keyof SoundSettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSoundSettings(next);
    // A preview, so that people hear what they just turned on.
    if (value) playSendSound();
  };

  return (
    <div className="accordion-body">
      <ul className="list-group list-group-flush">
        {ROWS.map(({ key, label, hint }, index) => (
          <li key={key} className={`list-group-item p-0${index > 0 ? " pt-3" : ""}`}>
            <div className="d-flex align-items-center">
              <div className="flex-grow-1 overflow-hidden">
                <h5 className="font-size-13 mb-1 text-truncate">{label}</h5>
                <p className="text-muted font-size-12 mb-0">{hint}</p>
              </div>
              <div className="flex-shrink-0 ms-2">
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`sound-${key}-switch`}
                    aria-label={label}
                    checked={settings[key]}
                    onChange={event => onChange(key, event.target.checked)}
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sounds;

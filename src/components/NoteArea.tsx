import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string | undefined;
  onSave: (v: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
  multiline?: boolean;
  disabled?: boolean;
}

/** Text field that keeps local edits and saves them shortly after typing stops. */
export function NoteArea({ value, onSave, placeholder, label, className, multiline = true, disabled }: Props) {
  const [text, setText] = useState(value ?? '');
  const focused = useRef(false);
  const timer = useRef<number>();

  useEffect(() => {
    if (!focused.current) setText(value ?? '');
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (v: string) => {
    setText(v);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onSave(v), 500);
  };
  const blur = () => {
    focused.current = false;
    clearTimeout(timer.current);
    if (text !== (value ?? '')) onSave(text);
  };

  const common = {
    'aria-label': label,
    className,
    placeholder,
    value: text,
    disabled,
    onFocus: () => { focused.current = true; },
    onBlur: blur
  };

  return multiline
    ? <textarea {...common} rows={3} onChange={(e) => change(e.target.value)} />
    : <input {...common} type="text" onChange={(e) => change(e.target.value)} />;
}

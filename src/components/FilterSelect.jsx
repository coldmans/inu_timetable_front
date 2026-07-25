import React, { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';

const FilterSelect = ({ value, onChange, active, label, disabled = false, optionWrap = false, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectId = useId();
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const options = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map(child => ({
      value: child.props.value,
      label: child.props.children
    }));
  const selectedIndex = options.findIndex(option => String(option.value) === String(value));
  const selectedOption = options[selectedIndex] || options[0];
  const listboxId = `${selectId}-listbox`;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => {
      optionRefs.current[nextIndex]?.focus();
    });
  }, [isOpen, selectedIndex]);

  const handleSelect = (nextValue) => {
    if (disabled) return;
    setIsOpen(false);
    if (String(nextValue) !== String(value)) {
      onChange({ target: { value: nextValue } });
    }
  };

  const focusOption = (nextIndex) => {
    const normalizedIndex = (nextIndex + options.length) % options.length;
    setActiveIndex(normalizedIndex);
    optionRefs.current[normalizedIndex]?.focus();
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleOptionKeyDown = (event, index, optionValue) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(index + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(index - 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.length - 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(optionValue);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        disabled={disabled}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
          }
        }}
        className={`field select-trigger ${active && !disabled ? 'select-trigger-active' : 'text-slate-600'}`}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          size={14}
          className={`ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} ${active && !disabled ? 'text-blue-500' : 'text-slate-400'}`}
        />
      </button>

      {isOpen && (
        <div className={`select-menu ${optionWrap ? 'select-menu-wide' : ''}`}>
          <div id={listboxId} role="listbox" aria-label={label} className="max-h-64 overflow-y-auto p-1">
            {options.map((option, optionIndex) => {
              const isSelected = String(option.value) === String(value);
              const isActive = optionIndex === activeIndex;

              return (
                <button
                  key={option.value}
                  ref={(element) => {
                    optionRefs.current[optionIndex] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isActive ? 0 : -1}
                  title={typeof option.label === 'string' ? option.label : undefined}
                  onClick={() => handleSelect(option.value)}
                  onKeyDown={(event) => handleOptionKeyDown(event, optionIndex, option.value)}
                  className={`select-option ${isSelected ? 'select-option-active' : ''}`}
                >
                  <span className={optionWrap ? 'break-keep leading-snug' : 'truncate'}>{option.label}</span>
                  {isSelected && <CheckCircle2 size={14} className="flex-shrink-0 text-blue-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSelect;

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronDown } from 'lucide-react';

// 메뉴는 body 포털 + fixed 배치로 렌더한다. 바텀시트(overflow 컨테이너 + 하단 고정 바) 안에서
// absolute 메뉴가 잘리거나 하단 바에 덮여 옵션을 탭할 수 없는 문제를 피하기 위함.
const MENU_MAX_HEIGHT = 256;
const MENU_MIN_HEIGHT = 140;
const VIEWPORT_GUTTER = 12;
// 드롭다운은 화면에 하나만 열리도록 전역 이벤트로 조율한다.
const OPEN_EVENT = 'inu-filter-select-open';

const FilterSelect = ({ value, onChange, active, label, disabled = false, optionWrap = false, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuLayout, setMenuLayout] = useState(null);
  const selectId = useId();
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
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

    document.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: selectId }));

    const handleOtherOpen = (event) => {
      if (event.detail !== selectId) {
        setIsOpen(false);
      }
    };
    // mousedown 대신 pointerdown: iOS 터치는 합성 mouse 이벤트가 늦거나 생략될 수 있다.
    const handlePointerDown = (event) => {
      if (containerRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    // fixed 메뉴는 트리거를 따라가지 못하므로 바깥 스크롤/리사이즈 시 닫는다.
    const handleScrollAway = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const handleResize = () => setIsOpen(false);

    document.addEventListener(OPEN_EVENT, handleOtherOpen);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollAway, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener(OPEN_EVENT, handleOtherOpen);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollAway, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, selectId]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_GUTTER;
    const spaceAbove = rect.top - VIEWPORT_GUTTER;
    const openUp = spaceBelow < Math.min(MENU_MAX_HEIGHT, 200) && spaceAbove > spaceBelow;

    setMenuLayout({
      left: rect.left,
      width: rect.width,
      top: openUp ? null : rect.bottom + 6,
      bottom: openUp ? viewportHeight - rect.top + 6 : null,
      maxHeight: Math.max(MENU_MIN_HEIGHT, Math.min(MENU_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow))
    });
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

      {isOpen && menuLayout && createPortal(
        <div
          ref={menuRef}
          className={`select-menu ${optionWrap ? 'select-menu-wide' : ''}`}
          style={{
            position: 'fixed',
            zIndex: 75,
            left: menuLayout.left,
            right: 'auto',
            top: menuLayout.top ?? 'auto',
            bottom: menuLayout.bottom ?? 'auto',
            width: optionWrap ? undefined : menuLayout.width,
            minWidth: optionWrap ? menuLayout.width : undefined
          }}
        >
          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="overflow-y-auto p-1"
            style={{ maxHeight: menuLayout.maxHeight }}
          >
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default FilterSelect;

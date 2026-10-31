import React from 'react';
import { NineGridPosition } from './pdfEngine';

interface PositionGridPickerProps {
  value: NineGridPosition;
  onChange: (pos: NineGridPosition) => void;
  disabled?: boolean;
}

const GRID_CELLS: { pos: NineGridPosition; label: string }[] = [
  { pos: 'top-left', label: 'Arriba Izquierda' },
  { pos: 'top-center', label: 'Arriba Centro' },
  { pos: 'top-right', label: 'Arriba Derecha' },
  { pos: 'middle-left', label: 'Centro Izquierda' },
  { pos: 'center', label: 'Centro' },
  { pos: 'middle-right', label: 'Centro Derecha' },
  { pos: 'bottom-left', label: 'Abajo Izquierda' },
  { pos: 'bottom-center', label: 'Abajo Centro' },
  { pos: 'bottom-right', label: 'Abajo Derecha' }
];

export const PositionGridPicker: React.FC<PositionGridPickerProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  return (
    <div className="pos-grid-wrapper">
      <div className={`pos-grid-box ${disabled ? 'is-disabled' : ''}`}>
        {GRID_CELLS.map((cell) => {
          const active = value === cell.pos;
          return (
            <button
              key={cell.pos}
              type="button"
              disabled={disabled}
              title={cell.label}
              onClick={() => onChange(cell.pos)}
              className={`pos-grid-cell ${active ? 'active' : ''}`}
            >
              <span className="pos-dot" />
            </button>
          );
        })}
      </div>
      <span className="pos-grid-caption">
        {GRID_CELLS.find((c) => c.pos === value)?.label || 'Centro'}
      </span>
    </div>
  );
};

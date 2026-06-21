import * as R from 'ramda';
import { getColumnWidth } from '@/utils';
import { Align } from '@/constants';

interface AgingSummaryColumn {
  key: string;
  label: string;
  cellIndex?: number;
}

const getTableCellValueAccessor = (index: number) => `cells[${index}].value`;

const contactNameAccessor = R.curry(
  (data: unknown[], column: AgingSummaryColumn) => ({
    key: column.key,
    Header: column.label,
    accessor: getTableCellValueAccessor(column.cellIndex!),
    sticky: 'left',
    width: 240,
    textOverview: true,
  }),
);

const currentAccessor = R.curry(
  (data: unknown[], column: AgingSummaryColumn) => {
    const accessor = getTableCellValueAccessor(column.cellIndex!);

    return {
      key: column.key,
      Header: column.label,
      accessor,
      className: column.key,
      width: getColumnWidth(data, accessor, { minWidth: 120 }),
      align: Align.Right,
      money: true,
    };
  },
);

const totalAccessor = R.curry((data: unknown[], column: AgingSummaryColumn) => {
  const accessor = getTableCellValueAccessor(column.cellIndex!);

  return {
    Header: column.label,
    id: column.key,
    accessor: getTableCellValueAccessor(column.cellIndex!),
    className: column.key,
    width: getColumnWidth(data, accessor, { minWidth: 120 }),
    align: Align.Right,
    money: true,
  };
});

const agingPeriodAccessor = R.curry(
  (data: unknown[], column: AgingSummaryColumn) => {
    const accessor = getTableCellValueAccessor(column.cellIndex!);

    return {
      Header: column.label,
      id: `${column.key}-${column.cellIndex}`,
      accessor,
      className: column.key,
      width: getColumnWidth(data, accessor, { minWidth: 120 }),
      align: Align.Right,
      money: true,
    };
  },
);

// Fallback mapper: guarantees every column gets a valid react-table shape
// (Header + accessor + id). Without this, an unrecognized column key leaves the
// raw `{ label, key, cellIndex }` object, which has no accessor/id and makes
// react-table's useTable throw.
const fallbackAccessor = R.curry((data: unknown[], column: AgingSummaryColumn) => {
  const accessor = getTableCellValueAccessor(column.cellIndex!);

  return {
    Header: column.label,
    id: `${column.key}-${column.cellIndex}`,
    accessor,
    className: column.key,
    width: getColumnWidth(data, accessor, { minWidth: 120 }),
    align: Align.Right,
    money: true,
  };
});

// Matches a column key against both snake_case and camelCase variants, since the
// server emits snake_case key values (e.g. `vendor_name`, `aging_period`) while
// some callers camelCase the payload.
const keyMatches = (...keys: string[]) =>
  R.compose(R.includes(R.__, keys), R.pathOr('', ['key']));

const dynamicColumnMapper = R.curry(
  (data: unknown[], column: AgingSummaryColumn) => {
    const mapper = R.cond([
      [keyMatches('total'), totalAccessor(data)],
      [keyMatches('current'), currentAccessor(data)],
      [
        keyMatches('customer_name', 'customerName', 'vendor_name', 'vendorName'),
        contactNameAccessor(data),
      ],
      [keyMatches('aging_period', 'agingPeriod'), agingPeriodAccessor(data)],
      [R.T, fallbackAccessor(data)],
    ]);

    return mapper(column);
  },
);

export const agingSummaryDynamicColumns = (
  columns: AgingSummaryColumn[],
  data: unknown[],
) => {
  return R.map(dynamicColumnMapper(data), columns);
};

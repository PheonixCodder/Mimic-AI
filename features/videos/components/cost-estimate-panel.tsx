import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MOCK_LINE_ITEMS = [
  { label: "Voice synthesis", amount: "$0.12" },
  { label: "Avatar animation", amount: "$0.45" },
  { label: "Video rendering", amount: "$0.80" },
  { label: "Captions (optional)", amount: "$0.05" },
];

type CostEstimatePanelProps = {
  scriptLength: number;
  resolution: string;
};

export function CostEstimatePanel({
  scriptLength,
  resolution,
}: CostEstimatePanelProps) {
  const resolutionSurcharge = resolution === "4k" ? "$0.50" : "$0.00";
  const total = "$1.42";

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">
          Estimated cost (preview)
        </h3>
        <p className="text-xs text-muted-foreground">
          Mock estimate based on {scriptLength.toLocaleString()} characters.
          Real billing connects in a later phase.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_LINE_ITEMS.map((item) => (
            <TableRow key={item.label}>
              <TableCell>{item.label}</TableCell>
              <TableCell className="text-right">{item.amount}</TableCell>
            </TableRow>
          ))}
          {resolution === "4k" ? (
            <TableRow>
              <TableCell>4K surcharge</TableCell>
              <TableCell className="text-right">{resolutionSurcharge}</TableCell>
            </TableRow>
          ) : null}
          <TableRow>
            <TableCell className="font-medium">Estimated total</TableCell>
            <TableCell className="text-right font-medium">{total}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Credits remaining and balance-after will appear here once Polar billing
        is wired.
      </p>
    </div>
  );
}

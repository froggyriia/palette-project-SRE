const AA_THRESHOLD = 4.5;

function ContrastBadge({ passes }) {
  return passes ? (
    <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 text-xs whitespace-nowrap">
      ✓ AA
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 text-xs whitespace-nowrap">
      ✗ AA
    </span>
  );
}

/** A live "Aa" preview: `fg` text actually rendered on an `bg` background,
 * so you SEE the readability instead of just reading a number. */
function TextPreview({ bg, fg }) {
  return (
    <div
      className="w-14 h-14 rounded-lg border border-black/10 shrink-0 flex items-center justify-center text-xl font-semibold shadow-sm"
      style={{ backgroundColor: bg, color: fg }}
    >
      Aa
    </div>
  );
}

function HexLabel({ hex }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-gray-600">
      <span className="inline-block w-3 h-3 rounded-sm border border-black/10 shrink-0" style={{ backgroundColor: hex }} />
      {hex}
    </span>
  );
}

/**
 * Renders the report from GET /palettes/{id}/contrast: pairwise contrast
 * between the palette's own colors (useful if you'd use one as text on
 * another), plus each color's contrast against plain white/black
 * (useful for "can this be body text on a normal page"). Each ratio comes
 * with an actual rendered text-on-background swatch, not just a number.
 */
export default function ContrastReport({ contrast }) {
  return (
    <div className="text-sm space-y-6 border rounded-lg p-4 bg-white">
      <div>
        <h3 className="font-medium mb-1">Контраст между цветами палитры</h3>
        <p className="text-xs text-gray-500 mb-3">
          Как выглядел бы один цвет как текст на фоне другого. Если у палитры схожая
          светлота (например, тетрада/триада из одного базового цвета), контраст внутри
          неё обычно низкий — это ожидаемо, а не ошибка.
        </p>
        <div className="space-y-3">
          {contrast.pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-4 border-t pt-3 first:border-t-0 first:pt-0">
              <TextPreview bg={p.color_b} fg={p.color_a} />
              <TextPreview bg={p.color_a} fg={p.color_b} />
              <div className="flex-1 space-y-0.5">
                <HexLabel hex={p.color_a} /> <span className="text-gray-400">на</span> <HexLabel hex={p.color_b} />
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-xs">{p.ratio}:1</div>
                <ContrastBadge passes={p.meets_aa_normal} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-1">Контраст с фоном</h3>
        <p className="text-xs text-gray-500 mb-3">
          Можно ли использовать цвет как текст на белом/чёрном фоне (порог AA — {AA_THRESHOLD}:1).
        </p>
        <div className="space-y-3">
          {contrast.backgrounds.map((b, i) => (
            <div key={i} className="flex items-center gap-4 border-t pt-3 first:border-t-0 first:pt-0">
              <TextPreview bg="#ffffff" fg={b.color} />
              <TextPreview bg="#000000" fg={b.color} />
              <div className="flex-1">
                <HexLabel hex={b.color} />
              </div>
              <div className="flex gap-4 shrink-0">
                <div className="text-right">
                  <div className="font-mono text-xs">{b.against_white}:1</div>
                  <ContrastBadge passes={b.against_white >= AA_THRESHOLD} />
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs">{b.against_black}:1</div>
                  <ContrastBadge passes={b.against_black >= AA_THRESHOLD} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

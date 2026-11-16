import type { WaterPoint } from "@/generated/prisma/client";

type WaterPointFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  waterPoint?: WaterPoint;
  operators?: { id: string; name: string; email: string }[];
  allowOperatorAssignment?: boolean;
};

export function WaterPointForm({ action, submitLabel, waterPoint, operators = [], allowOperatorAssignment = false }: WaterPointFormProps) {
  return (
    <form action={action} className="card">
      {waterPoint && <input type="hidden" name="waterPointId" value={waterPoint.id} />}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="code">Unique water-point code</label>
          <input id="code" name="code" minLength={2} maxLength={30} pattern="[A-Za-z0-9-]+" defaultValue={waterPoint?.code ?? ""} placeholder="KIT-BH-001" required />
          <small className="muted">Use a unique code. Letters, numbers and hyphens only.</small>
        </div>
        <div className="field">
          <label htmlFor="name">Water-point name</label>
          <input id="name" name="name" minLength={3} maxLength={120} defaultValue={waterPoint?.name ?? ""} placeholder="Kavaini Community Borehole" required />
        </div>
        <div className="field">
          <label htmlFor="type">Infrastructure type</label>
          <select id="type" name="type" defaultValue={waterPoint?.type ?? "BOREHOLE"} required>
            <option value="BOREHOLE">Borehole</option>
            <option value="HANDPUMP">Handpump</option>
            <option value="MOTORISED_SYSTEM">Motorised system</option>
            <option value="SPRING">Spring</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="county">County</label>
          <input id="county" name="county" minLength={2} maxLength={80} defaultValue={waterPoint?.county ?? ""} placeholder="Kitui" required />
        </div>
        <div className="field">
          <label htmlFor="subCounty">Sub-county</label>
          <input id="subCounty" name="subCounty" maxLength={80} defaultValue={waterPoint?.subCounty ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="community">Community / village</label>
          <input id="community" name="community" maxLength={100} defaultValue={waterPoint?.community ?? ""} />
        </div>
        {allowOperatorAssignment && <div className="field">
          <label htmlFor="operatorId">Assigned operator</label>
          <select id="operatorId" name="operatorId" defaultValue={waterPoint?.operatorId ?? ""}>
            <option value="">Unassigned (admin managed)</option>
            {operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name} · {operator.email}</option>)}
          </select>
        </div>}
        <div className="field">
          <label htmlFor="peopleServed">Estimated people served</label>
          <input id="peopleServed" name="peopleServed" type="number" min="0" max="1000000" defaultValue={waterPoint?.peopleServed ?? 0} required />
        </div>
        <div className="field">
          <label htmlFor="latitude">Latitude (optional)</label>
          <input id="latitude" name="latitude" type="number" min="-4.8" max="5.5" step="any" defaultValue={waterPoint?.latitude ?? ""} placeholder="-1.3667" />
        </div>
        <div className="field">
          <label htmlFor="longitude">Longitude (optional)</label>
          <input id="longitude" name="longitude" type="number" min="33.5" max="42.5" step="any" defaultValue={waterPoint?.longitude ?? ""} placeholder="38.0106" />
          <small className="muted">For Kenya, provide both coordinates or leave both blank.</small>
        </div>
        <div className="field" style={{ gap: 12, justifyContent: "center" }}>
          <label className="checkbox"><input name="servesSchool" type="checkbox" defaultChecked={waterPoint?.servesSchool ?? false} /> Serves a school</label>
          <label className="checkbox"><input name="servesHealthFacility" type="checkbox" defaultChecked={waterPoint?.servesHealthFacility ?? false} /> Serves a health facility</label>
          <label className="checkbox"><input name="alternativeWaterAvailable" type="checkbox" defaultChecked={waterPoint?.alternativeWaterAvailable ?? true} /> Alternative water is available</label>
        </div>
        <div className="field full">
          <label htmlFor="notes">Additional notes (optional)</label>
          <textarea id="notes" name="notes" maxLength={2000} defaultValue={waterPoint?.notes ?? ""} placeholder="Access instructions, equipment details or other operational context…" />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <button className="btn btn-primary" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}

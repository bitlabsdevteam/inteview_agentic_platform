type RoleOption = {
  value: "employer" | "job_seeker";
  label: string;
  description: string;
};

type RoleSelectorProps = {
  selectedRole: "employer" | "job_seeker" | null;
  onChange: (role: "employer" | "job_seeker") => void;
};

const roleOptions: RoleOption[] = [
  {
    value: "employer",
    label: "Employer",
    description: "Create and refine job descriptions, capture hiring context, and prepare roles for publishing."
  },
  {
    value: "job_seeker",
    label: "Job Seeker",
    description: "Register for interview preparation, scheduling, and future virtual interviewer-led sessions."
  }
];

export function RoleSelector({ selectedRole, onChange }: RoleSelectorProps) {
  return (
    <fieldset className="register-role-selector">
      <legend className="register-section-title">Choose Your Role</legend>
      <div className="register-role-selector__grid">
        {roleOptions.map((option) => {
          const isSelected = selectedRole === option.value;

          return (
            <label
              key={option.value}
              className={`register-role-card${isSelected ? " register-role-card--selected" : ""}`}
              data-testid={`register-role-option-${option.value === "job_seeker" ? "job-seeker" : option.value}`}
            >
              <input
                checked={isSelected}
                className="register-role-card__input"
                data-testid={`register-role-input-${option.value === "job_seeker" ? "job-seeker" : option.value}`}
                name="role"
                onChange={() => onChange(option.value)}
                type="radio"
                value={option.value}
              />
              <span className="register-role-card__eyebrow">Registration Path</span>
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

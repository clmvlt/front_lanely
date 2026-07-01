import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { SelectField } from "@/components/select-field"
import { vehiclesApi, vehicleKeys } from "@/features/vehicles"
import { useCompanyProfiles } from "@/features/profiles"
import { useCompanyMembers } from "@/features/companies"

interface BaseSelectProps {
  companyId: string
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  placeholder?: string
}

/**
 * Sélecteur d'assigné d'une tournée / lettre de voiture : livreurs mobiles
 * (Profile, actifs) et tout membre de la société (l'assignation est ouverte à
 * tous ; MANAGE_TRANSPORTS n'est requis que pour effectuer l'assignation, pas
 * pour être assigné). La valeur retournée est l'id du compte (`assignedAccountId`).
 */
export function AssigneeSelect({
  companyId,
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  placeholder,
}: BaseSelectProps) {
  const { t } = useTranslation()
  const profiles = useCompanyProfiles(companyId)
  const members = useCompanyMembers(companyId)

  const profileOptions = (profiles.data ?? [])
    .filter((p) => p.active)
    .map((p) => ({ value: p.id, label: p.displayName || p.username }))

  const memberOptions = (members.data ?? []).map((m) => ({
    value: m.userId,
    label: [m.firstName, m.lastName].filter(Boolean).join(" ").trim() || m.email,
  }))

  return (
    <SelectField
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      groups={[
        { label: t("transport.assign.groupProfiles"), options: profileOptions },
        { label: t("transport.assign.groupMembers"), options: memberOptions },
      ]}
      disabled={disabled}
      error={error}
      placeholder={placeholder ?? t("transport.assign.noProfile")}
    />
  )
}

/** Sélecteur de véhicule (véhicules actifs de l'entreprise). */
export function VehicleSelect({
  companyId,
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  placeholder,
}: BaseSelectProps) {
  const { t } = useTranslation()
  const params = { status: "ACTIVE" as const, size: 100 }
  const vehicles = useQuery({
    queryKey: [...vehicleKeys.lists(companyId), "select", params],
    queryFn: () => vehiclesApi.list(companyId, params),
    enabled: Boolean(companyId),
  })
  const options = (vehicles.data?.content ?? []).map((v) => ({
    value: v.id,
    label: [v.registrationPlate, [v.make, v.model].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(" · "),
  }))
  return (
    <SelectField
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      error={error}
      placeholder={placeholder ?? t("transport.assign.noVehicle")}
    />
  )
}

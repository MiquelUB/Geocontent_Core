import { getAdminLegends, getAllProfiles, getDefaultMunicipalityId, getDefaultMunicipalityTheme, getAppBranding } from "@/lib/actions";
import { getReports } from "@/lib/actions/reports";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const legends = await getAdminLegends();
  const profiles = await getAllProfiles();
  const reports = await getReports();
  const municipalityId = await getDefaultMunicipalityId();
  const municipalityTheme = await getDefaultMunicipalityTheme();
  const brand = await getAppBranding();

  return (
    <AdminDashboard
      legends={legends || []}
      profiles={profiles || []}
      reports={reports || []}
      municipalityId={municipalityId ?? undefined}
      municipalityTheme={municipalityTheme}
      brand={brand}
    />
  );
}

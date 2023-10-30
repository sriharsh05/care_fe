import { navigate } from "raviger";
import { useEffect, useState } from "react";
import CareIcon from "../../CAREUI/icons/CareIcon";
import { classNames } from "../../Utils/utils";
import { AssetData, AssetLocationObject } from "../Assets/AssetTypes";
import ButtonV2, { Cancel, Submit } from "../Common/components/ButtonV2";
import Page from "../Common/components/Page";
import Loading from "../Common/Loading";
import Pagination from "../Common/Pagination";
import { PatientModel } from "../Patient/models";
import { FacilityModel } from "./models";
import AutocompleteFormField from "../Form/FormFields/Autocomplete";
import { uniqBy } from "lodash-es";
import DialogModal from "../Common/Dialog";
import { LegacyMonitorCard } from "./LegacyMonitorCard";
import request from "../../Utils/request/request";
import routes from "../../Redux/api";

interface Monitor {
  patient: PatientModel;
  asset: AssetData;
  socketUrl: string;
}

const PER_PAGE_LIMIT = 6;
const CNS_REFRESH_INTERVAL = 0.5 * 60e3;

export default function LegacyFacilityCNS({
  facilityId,
}: {
  facilityId: string;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [monitors, setMonitors] = useState<Monitor[]>();
  const [facility, setFacility] = useState<FacilityModel>();
  const [currentPage, setCurrentPage] = useState(1);
  const [defaultShowAllLocation, setDefaultShowAllLocation] = useState(true);
  const searchParams = new URLSearchParams(window.location.search);

  // this wil set ?page=1 param in url if it is not present
  useEffect(() => {
    if (!searchParams.get("page")) {
      navigate(`/facility/${facilityId}/cns?page=1`);
    }
  }, []);
  const [location, setLocation] = useState<AssetLocationObject>();
  const [showSelectLocation, setShowSelectLocation] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    async function fetchFacility() {
      const { res, data } = await request(routes.getPermittedFacility, {
        pathParams: { facilityId },
      });
      if (res?.status === 200 && data) {
        const updateData = {
          id: Number(data.id),
          name: data.name,
          district: data.district_object.id,
          read_cover_image_url: data.read_cover_image_url,
          facility_type: data.facility_type.toString(),
          address: data.address,
          features: data.features,
          location: {
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
          },
          oxygen_capacity: data.oxygen_capacity,
          phone_number: data.phone_number,
          type_b_cylinders: data.type_b_cylinders,
          type_c_cylinders: data.type_c_cylinders,
          type_d_cylinders: data.type_d_cylinders,
          middleware_address: data.middleware_address,
          expected_type_b_cylinders: data.expected_type_b_cylinders,
          expected_type_c_cylinders: data.expected_type_c_cylinders,
          expected_type_d_cylinders: data.expected_type_d_cylinders,
          expected_oxygen_requirement: data.expected_oxygen_requirement,
          local_body_object: {
            name: data.local_body_object.name,
            body_type: data.local_body_object.body_type,
            localbody_code: data.local_body_object.localbody_code,
            district: data.local_body_object.district,
          },
          district_object: {
            id: data.district_object.id,
            name: data.district_object.name,
            state: data.district_object.state,
          },
          state_object: {
            id: data.state_object.id,
            name: data.state_object.name,
          },
          ward_object: {
            id: data.ward_object.id,
            name: data.ward_object.name,
            number: data.ward_object.number,
            local_body: data.ward_object.local_body,
          },
          modified_date: data.modified_date,
          created_date: data.created_date,
        };

        setFacility(updateData);
      }
    }
    fetchFacility();
  }, [facilityId]);

  useEffect(() => {
    if (!facility) return;
    const middlewareHostname = facility.middleware_address;

    async function fetchPatients() {
      const { res, data } = await request(routes.patientList, {
        query: {
          facility: facilityId,
          is_active: true,
        },
      });
      if (res && res.status === 200 && data) {
        const patients = data as PatientModel[];
        return patients.filter(
          (patient) => !!patient.last_consultation?.current_bed?.bed_object.id
        );
      }
    }

    async function fetchPatientMonitorAsset(patient: PatientModel) {
      // Request body in API documentation is not matching with request body of dispatch call
      const { res, data } = await request(routes.listAssetBeds, {
        query: { id: `asset-bed-${patient.id}` },
        pathParams: {
          bed: patient.last_consultation?.current_bed?.bed_object?.id || "",
        },
      });
      if (res?.status === 200 && data) {
        const asset = data.results.find(
          (assetBed: any) =>
            assetBed.asset_object.meta?.asset_type === "HL7MONITOR"
        )?.asset_object as AssetData | undefined;

        if (!asset) return;

        const socketUrl = `wss://${middlewareHostname}/observations/${asset.meta?.local_ip_address}`;

        return { patient, asset, socketUrl } as Monitor;
      }
    }

    async function fetchMonitors() {
      const patients = await fetchPatients();
      if (!patients) return;

      const monitors = await Promise.all(
        patients.map((patient) => fetchPatientMonitorAsset(patient))
      );
      return monitors.filter((monitor) => !!monitor) as Monitor[];
    }

    fetchMonitors().then((monitors) => {
      setCurrentPage(Number(searchParams.get("page")));
      setMonitors(monitors);
    });

    const interval = setInterval(() => {
      fetchMonitors().then(setMonitors);
    }, CNS_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [facility, facilityId]);

  if (!monitors) return <Loading />;
  return (
    <Page
      title={`Central Nursing Station: ${
        defaultShowAllLocation
          ? "All Locations"
          : `${facility?.name} - ${location?.name}`
      }`}
      backUrl={`/facility/${facilityId}`}
      noImplicitPadding
      breadcrumbs={false}
      options={
        <div className="flex items-center gap-4">
          {monitors?.length > 0 ? (
            <>
              <ButtonV2
                variant="secondary"
                border
                onClick={() => setShowSelectLocation(true)}
              >
                <CareIcon className="care-l-location-point text-lg" />
                Change Location
              </ButtonV2>
              <ButtonV2
                variant="secondary"
                border
                onClick={() => {
                  if (isFullscreen) {
                    document.exitFullscreen();
                  } else {
                    document.documentElement.requestFullscreen();
                  }
                }}
                className="tooltip !h-11"
              >
                <CareIcon
                  className={classNames(
                    isFullscreen
                      ? "care-l-compress-arrows"
                      : "care-l-expand-arrows-alt",
                    "text-lg"
                  )}
                />
                <span className="tooltip-text tooltip-bottom -translate-x-1/2">
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </span>
              </ButtonV2>
            </>
          ) : (
            <>
              <ButtonV2
                variant="secondary"
                border
                onClick={() => history.go(-2)}
              >
                Go Back
              </ButtonV2>
            </>
          )}

          <Pagination
            className=""
            cPage={currentPage}
            onChange={(page) => {
              setCurrentPage(page);
              navigate(`/facility/${facilityId}/cns?page=${page}`);
            }}
            data={{
              totalCount: defaultShowAllLocation
                ? monitors.length
                : monitors.filter(
                    (m) => m.asset.location_object.id === location?.id
                  ).length,
            }}
            defaultPerPage={PER_PAGE_LIMIT}
          />
        </div>
      }
    >
      <DialogModal
        title="Select Location"
        show={showSelectLocation}
        onClose={() => setShowSelectLocation(false)}
        className="w-full max-w-md"
      >
        {!monitors && <Loading />}
        <div className="flex flex-col gap-2">
          <AutocompleteFormField
            className="mt-2"
            name="location"
            placeholder="Pick a location"
            value={location}
            onChange={({ value }) => setLocation(value)}
            options={
              monitors
                ? uniqBy(
                    monitors.map((m) => m.asset.location_object),
                    "id"
                  )
                : []
            }
            isLoading={!monitors}
            optionLabel={(location) => location.name}
            optionDescription={(location) =>
              location.description +
              " (" +
              monitors.filter((m) => m.asset.location_object.id === location.id)
                .length +
              " patients)"
            }
            optionValue={(location) => location}
            disabled={!monitors}
          />
          <div className="justify-end md:flex">
            <ButtonV2
              variant="primary"
              className="my-2 mr-2 w-full"
              onClick={() => {
                setDefaultShowAllLocation(true);
                setShowSelectLocation(false);
              }}
            >
              Show All Locations
            </ButtonV2>
            <Submit
              onClick={() => {
                setDefaultShowAllLocation(false);
                setShowSelectLocation(false);
              }}
              className="my-2 mr-2"
              label="Confirm"
            />
            <Cancel
              onClick={() => setShowSelectLocation(false)}
              className="my-2 mr-2"
            />
          </div>
        </div>
      </DialogModal>
      {monitors.length === 0 && (
        <div className="flex h-[80vh] w-full items-center justify-center text-center text-black">
          No patients are currently monitored
        </div>
      )}
      <div className="mt-4 grid grid-cols-1 gap-1 lg:grid-cols-3">
        {defaultShowAllLocation
          ? monitors
              ?.slice(
                (currentPage - 1) * PER_PAGE_LIMIT,
                currentPage * PER_PAGE_LIMIT
              )
              .map(({ patient, socketUrl, asset }) => (
                <LegacyMonitorCard
                  key={patient.id}
                  location={asset.location_object}
                  facilityId={facilityId}
                  patient={patient}
                  socketUrl={socketUrl}
                />
              ))
          : monitors
              ?.filter((m) => m.asset.location_object.id === location?.id)
              ?.slice(
                (currentPage - 1) * PER_PAGE_LIMIT,
                currentPage * PER_PAGE_LIMIT
              )
              .map(({ patient, socketUrl, asset }) => (
                <LegacyMonitorCard
                  key={patient.id}
                  location={asset.location_object}
                  facilityId={facilityId}
                  patient={patient}
                  socketUrl={socketUrl}
                />
              ))}
      </div>
    </Page>
  );
}

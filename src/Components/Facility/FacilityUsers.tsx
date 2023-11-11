import { lazy, useState } from "react";
import Pagination from "../Common/Pagination";
import { USER_TYPES, RESULTS_PER_PAGE_LIMIT } from "../../Common/constants";
import { FacilityModel } from "../Facility/models";
import LinkFacilityDialog from "../Users/LinkFacilityDialog";
import UserDeleteDialog from "../Users/UserDeleteDialog";
import * as Notification from "../../Utils/Notifications.js";
import UserDetails from "../Common/UserDetails";
import UnlinkFacilityDialog from "../Users/UnlinkFacilityDialog";
import { classNames, isUserOnline, relativeTime } from "../../Utils/utils";
import CountBlock from "../../CAREUI/display/Count";
import CareIcon from "../../CAREUI/icons/CareIcon";
import ButtonV2 from "../Common/components/ButtonV2";
import Page from "../Common/components/Page";
import useAuthUser from "../../Common/hooks/useAuthUser";
import request from "../../Utils/request/request";
import routes from "../../Redux/api";
import useQuery from "../../Utils/request/useQuery";

const Loading = lazy(() => import("../Common/Loading"));

export default function FacilityUsers(props: any) {
  const { facilityId } = props;
  let manageUsers: any = null;
  const [isUnlinkFacilityLoading, setIsUnlinkFacilityLoading] = useState(false);
  const [isAddFacilityLoading, setIsAddFacilityLoading] = useState(false);
  const [isLoadFacilityLoading, setIsLoadFacilityLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [offset, setOffset] = useState(0);
  const authUser = useAuthUser();

  const [linkFacility, setLinkFacility] = useState<{
    show: boolean;
    username: string;
  }>({ show: false, username: "" });

  const [userData, setUserData] = useState<{
    show: boolean;
    username: string;
    name: string;
  }>({ show: false, username: "", name: "" });

  const [unlinkFacilityData, setUnlinkFacilityData] = useState<{
    show: boolean;
    userName: string;
    facility?: FacilityModel;
  }>({ show: false, userName: "", facility: undefined });

  const limit = RESULTS_PER_PAGE_LIMIT;

  const { data: facilityData } = useQuery(routes.getAnyFacility, {
    pathParams: {
      id: facilityId,
    },
    prefetch: facilityId !== undefined,
  });

  const {
    data: facilityUserData,
    refetch: facilityUserFetch,
    loading: isLoading,
  } = useQuery(routes.getFacilityUsers, {
    query: { offset: offset, limit: limit },
    pathParams: { facility_id: facilityId },
    prefetch: facilityId !== undefined,
  });

  const handlePagination = (page: number, limit: number) => {
    const offset = (page - 1) * limit;
    setCurrentPage(page);
    setOffset(offset);
  };

  const loadFacilities = async (username: string) => {
    if (isUnlinkFacilityLoading || isAddFacilityLoading) {
      return;
    }
    setIsLoadFacilityLoading(true);
    const { res, data } = await request(routes.userListFacility, {
      pathParams: { username: username },
    });
    if (res?.ok && data && facilityUserData) {
      facilityUserData.results = facilityUserData.results.map((user) => {
        return user.username === username
          ? {
              ...user,
              facilities: data,
            }
          : user;
      });
    }
    setIsLoadFacilityLoading(false);
  };

  const showLinkFacilityModal = (username: string) => {
    setLinkFacility({
      show: true,
      username,
    });
  };

  const hideUnlinkFacilityModal = () => {
    setUnlinkFacilityData({
      show: false,
      facility: undefined,
      userName: "",
    });
  };

  const hideLinkFacilityModal = () => {
    setLinkFacility({
      show: false,
      username: "",
    });
  };

  const handleUnlinkFacilitySubmit = async () => {
    setIsUnlinkFacilityLoading(true);
    await request(routes.deleteUserFacility, {
      // body given in the dispatch call but there is no body in API documentation
      body: { facility: String(unlinkFacilityData?.facility?.id) },
      pathParams: {
        username: unlinkFacilityData.userName,
      },
      onResponse: ({ res }) => {
        if (res?.status === 204) {
          Notification.Success({
            msg: "User Facility deleted successfully",
          });
        }
      },
    });
    setIsUnlinkFacilityLoading(false);
    loadFacilities(unlinkFacilityData.userName);
    hideUnlinkFacilityModal();
  };

  const handleCancel = () => {
    setUserData({ show: false, username: "", name: "" });
  };

  const handleSubmit = async () => {
    const username = userData.username;
    await request(routes.deleteUser, {
      pathParams: { username: username },
      onResponse: ({ res }) => {
        if (res?.status === 204) {
          Notification.Success({
            msg: "User deleted successfully",
          });
        }
      },
    });
    setUserData({ show: false, username: "", name: "" });
    facilityUserFetch();
  };

  const handleDelete = (user: any) => {
    setUserData({
      show: true,
      username: user.username,
      name: `${user.first_name} ${user.last_name}`,
    });
  };

  const facilityClassname = classNames(
    "align-baseline text-sm font-bold",
    isAddFacilityLoading || isUnlinkFacilityLoading || isLoadFacilityLoading
      ? "text-gray-500"
      : "text-blue-500 hover:text-blue-800"
  );

  const showLinkFacility = (username: string) => {
    return (
      <a
        onClick={() => showLinkFacilityModal(username)}
        className={facilityClassname}
        href="#"
      >
        Link new facility
      </a>
    );
  };

  const showFacilities = (username: string, facilities: FacilityModel[]) => {
    if (!facilities || !facilities.length) {
      return (
        <>
          <div className="font-semibold">No Facilities!</div>
          {showLinkFacility(username)}
        </>
      );
    }
    return (
      <div className="col-span-full sm:col-span-3 sm:col-start-2">
        <div className="mb-2">
          {facilities.map((facility, i) => (
            <div
              key={`facility_${i}`}
              className="font-gbold mr-3 mt-2 inline-block rounded-md border-2 py-1 pl-3"
            >
              <div className="flex items-center  space-x-1">
                <div className="font-semibold">{facility.name}</div>
                <ButtonV2
                  size="small"
                  circle
                  variant="secondary"
                  disabled={isUnlinkFacilityLoading}
                  onClick={() =>
                    setUnlinkFacilityData({
                      show: true,
                      facility: facility,
                      userName: username,
                    })
                  }
                >
                  <CareIcon className="care-l-multiply" />
                </ButtonV2>
              </div>
            </div>
          ))}
        </div>
        {showLinkFacility(username)}
        {unlinkFacilityData.show && (
          <UnlinkFacilityDialog
            facilityName={unlinkFacilityData.facility?.name || ""}
            userName={unlinkFacilityData.userName}
            isHomeFacility={false}
            handleCancel={hideUnlinkFacilityModal}
            handleOk={handleUnlinkFacilitySubmit}
          />
        )}
      </div>
    );
  };

  const addFacility = async (username: string, facility: any) => {
    hideLinkFacilityModal();
    setIsAddFacilityLoading(true);
    // Remaining props of request are not specified in dispatch request
    await request(routes.addUserFacility, {
      body: {
        facility: String(facility.id),
      },
      pathParams: {
        username: username,
      },
    });
    setIsAddFacilityLoading(false);
    loadFacilities(username);
  };

  const showDelete = (user: any) => {
    const STATE_ADMIN_LEVEL = USER_TYPES.indexOf("StateAdmin");
    const STATE_READ_ONLY_ADMIN_LEVEL =
      USER_TYPES.indexOf("StateReadOnlyAdmin");
    const DISTRICT_ADMIN_LEVEL = USER_TYPES.indexOf("DistrictAdmin");
    const level = USER_TYPES.indexOf(user.user_type);
    const currentUserLevel = USER_TYPES.indexOf(authUser.user_type);
    if (user.is_superuser) return true;

    if (currentUserLevel >= STATE_ADMIN_LEVEL)
      return user.state_object?.id === authUser.state;
    if (
      currentUserLevel < STATE_READ_ONLY_ADMIN_LEVEL &&
      currentUserLevel >= DISTRICT_ADMIN_LEVEL &&
      currentUserLevel > level
    )
      return facilityData?.district_object?.id === authUser.district;
    return false;
  };

  let userList: any[] = [];

  facilityUserData &&
    facilityUserData.results &&
    facilityUserData.results.length &&
    (userList = facilityUserData.results.map((user: any) => {
      return (
        <div
          key={`usr_${user.id}`}
          className=" mt-6 w-full md:px-4 lg:w-1/2 xl:w-1/3"
        >
          <div className="block h-full cursor-pointer overflow-hidden rounded-lg bg-white shadow hover:border-primary-500">
            <div className="flex h-full flex-col justify-between">
              <div className="px-6 py-4">
                <div className="flex flex-col justify-between lg:flex-row">
                  {user.username && (
                    <div
                      id="user-view-name"
                      className="inline-flex w-fit items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-sm font-medium leading-5 text-blue-800"
                    >
                      {user.username}
                    </div>
                  )}
                  <div className="min-width-50 shrink-0 text-sm text-gray-600">
                    Last Online:{" "}
                    <span
                      aria-label="Online"
                      className={
                        "inline-block h-2 w-2 shrink-0 rounded-full " +
                        (isUserOnline(user) ? "bg-primary-400" : "bg-gray-300")
                      }
                    ></span>
                    <span className="pl-2">
                      {user.last_login
                        ? relativeTime(user.last_login)
                        : "Never"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold capitalize">
                  {`${user.first_name} ${user.last_name}`}

                  {user.last_login && isUserOnline(user) ? (
                    <i
                      className="fas fa-circle ml-1 animate-pulse text-primary-500 opacity-75"
                      aria-label="Online"
                    ></i>
                  ) : null}
                  {showDelete(user) && (
                    <button
                      type="button"
                      className="focus:ring-blue m-3 w-20 self-end rounded-md border border-red-500 bg-white px-3 py-2 text-center text-sm font-medium leading-4 text-red-700 transition duration-150 ease-in-out hover:text-red-500 hover:shadow focus:border-red-300 focus:outline-none active:bg-gray-50 active:text-red-800"
                      onClick={() => handleDelete(user)}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="flex justify-between">
                  {user.user_type && (
                    <UserDetails title="Role">
                      <div className="font-semibold">{user.user_type}</div>
                    </UserDetails>
                  )}
                  {user.district_object && (
                    <UserDetails title="District">
                      <div className="font-semibold">
                        {user.district_object.name}
                      </div>
                    </UserDetails>
                  )}
                </div>
                {user.local_body_object && (
                  <UserDetails title="Location">
                    <div className="font-semibold">
                      {user.local_body_object.name}
                    </div>
                  </UserDetails>
                )}
                <div className="flex justify-between">
                  {user.created_by && (
                    <UserDetails title="Created by">
                      <div className="font-semibold">{user.created_by}</div>
                    </UserDetails>
                  )}
                  {user.phone_number && (
                    <div className="mt-2 border-t bg-gray-50 px-6 py-2">
                      <div className="flex justify-between py-4">
                        <div>
                          <div className="leading-relaxed text-gray-500">
                            Phone:
                          </div>
                          <a
                            href={`tel:${user.phone_number}`}
                            className="font-semibold"
                          >
                            {user.phone_number || "-"}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {user.username && (
                  <UserDetails title="Facilities">
                    {user.facilities &&
                      showFacilities(user.username, user.facilities)}
                    {!user.facilities && (
                      <a
                        onClick={() => loadFacilities(user.username)}
                        className={`inline-block ${facilityClassname}`}
                        href="#"
                      >
                        Click here to show
                      </a>
                    )}
                  </UserDetails>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }));

  if (!facilityUserData) {
    manageUsers = <Loading />;
  } else if (facilityUserData.results && facilityUserData.results.length) {
    manageUsers = (
      <div>
        <div className="flex flex-wrap md:-mx-4">{userList}</div>
        {facilityUserData && facilityUserData.count > limit && (
          <div className="mt-4 flex w-full justify-center">
            <Pagination
              cPage={currentPage}
              defaultPerPage={limit}
              data={{ totalCount: facilityUserData.count }}
              onChange={handlePagination}
            />
          </div>
        )}
      </div>
    );
  } else if (
    facilityUserData.results &&
    facilityUserData.results.length === 0
  ) {
    manageUsers = (
      <div>
        <div>
          <h5> No Users Found</h5>
        </div>
      </div>
    );
  }

  return (
    <Page
      title={`Users - ${facilityData?.name}`}
      hideBack={true}
      className="mx-3 md:mx-8"
      breadcrumbs={false}
    >
      {linkFacility.show && (
        <LinkFacilityDialog
          username={linkFacility.username}
          handleOk={addFacility}
          handleCancel={hideLinkFacilityModal}
        />
      )}

      <div className="m-4 mt-5 grid grid-cols-1 sm:grid-cols-3 md:gap-5 md:px-4">
        {facilityUserData && (
          <CountBlock
            text="Total Users"
            count={facilityUserData.count}
            loading={isLoading}
            icon="l-user-injured"
            className="flex-1"
          />
        )}
      </div>
      <div className="px-3 md:px-8">
        <div>{manageUsers}</div>
      </div>
      {userData.show && (
        <UserDeleteDialog
          name={userData.name}
          handleCancel={handleCancel}
          handleOk={handleSubmit}
        />
      )}
    </Page>
  );
}

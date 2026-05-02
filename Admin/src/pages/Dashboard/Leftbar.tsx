import React from "react";
import { TabContent, TabPane } from "reactstrap";

// hooks
import { useRedux } from "../../hooks/index";
import { createSelector } from "reselect";
// constants
import { TABS } from "../../constants/index";

// component
import ProfileSearch from "../../components/ProfileSearch";
import Profile from "./Profile/index";
import Chats from "./Chats/index";
import Calls from "./Calls/index";
import Bookmark from "./Bookmark/index";
import Notifications from "./Notifications/index";
import Settings from "./Settings/index";
import Stack from "./Stack/index";

interface LeftbarProps {}
const Leftbar = (props: LeftbarProps) => {
  // global store
  const { useAppSelector } = useRedux();

  // const { activeTab } = useAppSelector(state => ({
  //   activeTab: state.Layout.activeTab,
  // }));
  const errorData = createSelector(
    (state : any) => state.Layout,
    (state) => ({
      activeTab: state.activeTab,
    })
  );
  // Inside your component
  const { activeTab} = useAppSelector(errorData);

  return (
    <>
      {/* start chat-leftsidebar */}
      <div className="chat-leftsidebar">
        <ProfileSearch />
        <TabContent activeTab={activeTab}>
          {/* Start Profile tab-pane */}
          <TabPane
            tabId={TABS.USERS}
            role="tabpanel"
          >
            <Profile />
          </TabPane>

          <TabPane
            tabId={TABS.CHAT}
            role="tabpanel"
          >
            <Chats />
          </TabPane>

          <TabPane
            tabId={TABS.CALLS}
            role="tabpanel"
          >
            <Calls />
          </TabPane>

          <TabPane
            tabId={TABS.NOTIFICATIONS}
            role="tabpanel"
          >
            <Notifications />
          </TabPane>

          <TabPane
            tabId={TABS.BOOKMARK}
            role="tabpanel"
          >
            <Bookmark />
          </TabPane>

          <TabPane tabId={TABS.GITHUB} role="tabpanel">
            <div className="px-3 py-4 text-center text-muted font-size-13">
              Repositories and code review open in the main panel when this tab is selected.
            </div>
          </TabPane>

          <TabPane
            tabId={TABS.STACK}
            role="tabpanel"
          >
            <Stack />
          </TabPane>

          <TabPane
            tabId={TABS.SETTINGS}
            role="tabpanel"
          >
            <Settings />
          </TabPane>
        </TabContent>
      </div>
    </>
  );
};

export default Leftbar;

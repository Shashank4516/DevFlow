import React from "react";
import classnames from "classnames";
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

  const hideSidebar = activeTab === TABS.GITHUB;

  return (
    <>
      {/* start chat-leftsidebar — hidden on GitHub tab so the code workspace uses full width */}
      <div
        className={classnames("chat-leftsidebar", hideSidebar && "d-none")}
        aria-hidden={hideSidebar}
      >
        {activeTab !== TABS.STACK && <ProfileSearch />}
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

          <TabPane tabId={TABS.GITHUB} role="tabpanel" />

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

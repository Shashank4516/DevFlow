import React from "react";

// interface
import { BasicDetailsTypes } from "../../../data/myProfile";

interface UserDescriptionProps {
  basicDetails: BasicDetailsTypes;
}
const UserDescription = ({ basicDetails }: UserDescriptionProps) => {
  return (
    <>
      <div className="text-muted small mb-3">
        <p className="mb-0">
          {basicDetails && basicDetails.description
            ? basicDetails.description
            : "-"}
        </p>
      </div>

      <div className="profile-details-rows">
        <div className="d-flex align-items-start py-2">
          <div className="flex-shrink-0 me-2 text-muted" style={{ width: "1.25rem" }}>
            <i className="bx bx-user align-middle"></i>
          </div>
          <div className="flex-grow-1 min-w-0">
            <p className="mb-0 text-break">
              {basicDetails && basicDetails.fullName
                ? basicDetails.fullName
                : "-"}
            </p>
          </div>
        </div>

        <div className="d-flex align-items-start py-2">
          <div className="flex-shrink-0 me-2 text-muted" style={{ width: "1.25rem" }}>
            <i className="bx bx-message-rounded-dots align-middle"></i>
          </div>
          <div className="flex-grow-1 min-w-0">
            <p className="mb-0 text-break">
              {basicDetails && basicDetails.email ? basicDetails.email : "-"}
            </p>
          </div>
        </div>

        <div className="d-flex align-items-start py-2">
          <div className="flex-shrink-0 me-2 text-muted" style={{ width: "1.25rem" }}>
            <i className="bx bx-location-plus align-middle"></i>
          </div>
          <div className="flex-grow-1 min-w-0">
            <p className="mb-0 text-break">
              {basicDetails && basicDetails.location
                ? basicDetails.location
                : "-"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDescription;

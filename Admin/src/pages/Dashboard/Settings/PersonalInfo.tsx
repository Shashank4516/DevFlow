import React, { useState, useEffect } from "react";
import { Button, Input, FormGroup, Label } from "reactstrap";

// interface
import { BasicDetailsTypes } from "../../../data/settings";

interface PersonalInfoProps {
  basicDetails: BasicDetailsTypes;
  onChangeData?: (field: string, value: any) => void;
}
const PersonalInfo = ({ basicDetails, onChangeData }: PersonalInfoProps) => {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(basicDetails?.firstName ?? "");
  const [lastName, setLastName] = useState(basicDetails?.lastName ?? "");
  const [email, setEmail] = useState(basicDetails?.email ?? "");
  const [location, setLocation] = useState(basicDetails?.location ?? "");

  useEffect(() => {
    setFirstName(basicDetails?.firstName ?? "");
    setLastName(basicDetails?.lastName ?? "");
    setEmail(basicDetails?.email ?? "");
    setLocation(basicDetails?.location ?? "");
  }, [basicDetails]);

  const fullName = basicDetails
    ? `${basicDetails.firstName || ""} ${basicDetails.lastName || ""}`.trim() || "-"
    : "-";

  const handleSave = () => {
    if (onChangeData && basicDetails) {
      onChangeData("basicDetails", {
        ...basicDetails,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        location: location.trim(),
      });
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setFirstName(basicDetails?.firstName ?? "");
    setLastName(basicDetails?.lastName ?? "");
    setEmail(basicDetails?.email ?? "");
    setLocation(basicDetails?.location ?? "");
    setEditing(false);
  };

  return (
    <div className="accordion-body">
      <div className="float-end">
        {!editing ? (
          <Button
            color="none"
            type="button"
            className="btn btn-soft-primary btn-sm"
            onClick={() => setEditing(true)}
          >
            <i className="bx bxs-pencil align-middle"></i> Edit
          </Button>
        ) : (
          <span>
            <Button
              color="primary"
              size="sm"
              className="me-1"
              onClick={handleSave}
            >
              Save
            </Button>
            <Button color="light" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </span>
        )}
      </div>

      {editing ? (
        <div className="mt-3">
          <FormGroup>
            <Label className="text-muted">First name</Label>
            <Input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="font-size-14"
            />
          </FormGroup>
          <FormGroup>
            <Label className="text-muted">Last name</Label>
            <Input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="font-size-14"
            />
          </FormGroup>
          <FormGroup>
            <Label className="text-muted">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="font-size-14"
            />
          </FormGroup>
          <FormGroup>
            <Label className="text-muted">Location</Label>
            <Input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="font-size-14"
            />
          </FormGroup>
        </div>
      ) : (
        <>
          <div>
            <p className="text-muted mb-1">Name</p>
            <h5 className="font-size-14">{fullName}</h5>
          </div>

          <div className="mt-4">
            <p className="text-muted mb-1">Email</p>
            <h5 className="font-size-14">
              {basicDetails && basicDetails.email ? basicDetails.email : "-"}
            </h5>
          </div>

          <div className="mt-4">
            <p className="text-muted mb-1">Location</p>
            <h5 className="font-size-14 mb-0">
              {basicDetails && basicDetails.location ? basicDetails.location : "-"}
            </h5>
          </div>
        </>
      )}
    </div>
  );
};

export default PersonalInfo;

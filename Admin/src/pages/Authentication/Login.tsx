import React, { useEffect, useState } from "react";
import { Alert, Row, Col, Form, Label, Button } from "reactstrap";

// assests
import githubIcon from "../../assets/login-icons/icons8-github-48.png";

// router
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

// validations
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useForm } from "react-hook-form";

// hooks
import { useProfile, useRedux } from "../../hooks/index";
import { createSelector } from "reselect";
//actions
import { loginUser, setSettingsFromAuthUser } from "../../redux/actions";

// Firebase helper for native Google sign-in (used when backend is not set)
import { getFirebaseBackend } from "../../helpers/firebase_helper";

import { isDemoMode } from "../../demo";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

// components
import NonAuthLayoutWrapper from "../../components/NonAutnLayoutWrapper";
import AuthHeader from "../../components/AuthHeader";
import FormInput from "../../components/FormInput";
import Loader from "../../components/Loader";

interface LoginProps {}
const Login = (props: LoginProps) => {
  // global store
  const { dispatch, useAppSelector } = useRedux();

  // const { isUserLogin, error, loginLoading, isUserLogout } = useAppSelector(
  //   state => ({
  //     isUserLogin: state.Login.isUserLogin,
  //     error: state.Login.error,
  //     loginLoading: state.Login.loading,
  //     isUserLogout: state.Login.isUserLogout,
  //   })
  // );

  const errorData = createSelector(
    (state: any) => state.Login,
    state => ({
      isUserLogin: state.isUserLogin,
      error: state.error,
      loginLoading: state.loading,
      isUserLogout: state.isUserLogout,
    }),
  );
  // Inside your component
  const { isUserLogin, error, loginLoading, isUserLogout } =
    useAppSelector(errorData);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [redirectUrl, setRedirectUrl] = useState("/");
  const urlError = searchParams.get("error");
  const urlErrorDescription = searchParams.get("error_description");
  useEffect(() => {
    const url =
      location.state && location.state.from
        ? location.state.from.pathname
        : "/";
    setRedirectUrl(url);
  }, [location]);
  useEffect(() => {
    if (isUserLogin && !loginLoading && !isUserLogout) {
      navigate(redirectUrl);
    }
  }, [isUserLogin, navigate, loginLoading, isUserLogout, redirectUrl]);

  const resolver = yupResolver(
    yup.object().shape({
      email: yup.string().required("Please Enter E-mail."),
      password: yup.string().required("Please Enter Password."),
    }),
  );

  const defaultValues: any = {
    email: "example@mail.com",
    password: "123456",
  };

  const methods = useForm({ defaultValues, resolver });
  const {
    handleSubmit,
    register,
    control,
    formState: { errors },
  } = methods;

  const onSubmitForm = async (values: object) => {
    dispatch(loginUser(values));
  };

  const { userProfile, loading } = useProfile();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);

  if (userProfile && !loading) {
    return <Navigate to={{ pathname: redirectUrl }} />;
  }

  // GitHub Sign-In: redirect to PHP backend (then GitHub). Do redirect first so React doesn't Navigate to dashboard before we leave.
  const handleGitHubSignIn = () => {
    if (isDemoMode) {
      dispatch(loginUser(defaultValues));
      return;
    }
    if (!BACKEND_URL) {
      setGithubError("Backend URL not set. Add VITE_BACKEND_URL to .env.");
      return;
    }
    window.location.href = `${BACKEND_URL.replace(/\/$/, "")}/auth/github/index.php`;
  };

  // Google Sign-In: PHP backend (redirect) or Firebase (popup). Redirect first so we don't get Navigate-to-dashboard first.
  const handleGoogleSignIn = async () => {
    if (isDemoMode) {
      dispatch(loginUser(defaultValues));
      return;
    }
    if (BACKEND_URL) {
      setGoogleError(null);
      window.location.href = `${BACKEND_URL.replace(/\/$/, "")}/auth/google/index.php`;
      return;
    }
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const firebaseBackend = getFirebaseBackend();
      if (firebaseBackend) {
        const result = await firebaseBackend.signInWithGoogle();
        if (result && result.basicDetails) {
          dispatch(setSettingsFromAuthUser(result.basicDetails));
        }
        navigate(redirectUrl);
      }
    } catch (err: any) {
      setGoogleError(err || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <NonAuthLayoutWrapper>
      <Row className=" justify-content-center my-auto">
        <Col sm={8} lg={6} xl={5} className="col-xxl-4">
          <div className="py-md-5 py-4">
            <AuthHeader
              title="Welcome Back !"
              subtitle="Sign in to continue to DevFlow."
            />

            {error && <Alert color="danger">{error}</Alert>}
            {googleError && <Alert color="danger">{googleError}</Alert>}
            {githubError && <Alert color="danger">{githubError}</Alert>}
            {urlError && !googleError && !githubError && (
              <Alert color="danger">
                {urlError.startsWith("github_") ? "GitHub" : "Google"} sign-in
                failed: {urlError}
                {urlErrorDescription ? ` (${urlErrorDescription})` : ""}
              </Alert>
            )}

            <Form
              onSubmit={handleSubmit(onSubmitForm)}
              className="position-relative"
            >
              {loginLoading && <Loader />}
              <div className="mb-3">
                <FormInput
                  label="Username"
                  type="text"
                  name="email"
                  register={register}
                  errors={errors}
                  control={control}
                  labelClassName="form-label"
                  placeholder="Enter username"
                  className="form-control"
                />
              </div>

              <div className="mb-3">
                <FormInput
                  label="Password"
                  type="password"
                  name="password"
                  register={register}
                  errors={errors}
                  control={control}
                  labelClassName="form-label"
                  className="form-control pe-5"
                  placeholder="Enter Password"
                />
              </div>

              <div className="form-check form-check-info font-size-16">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="remember-check"
                />
                <Label
                  className="form-check-label font-size-14"
                  htmlFor="remember-check"
                >
                  Remember me
                </Label>
              </div>

              <div className="text-center mt-4">
                <Button className="w-100 btn-login-figma" type="submit">
                  Login
                </Button>
              </div>

              <div className="mt-4 text-center">
                <div className="signin-other-title">
                  <h5 className="font-size-14 mb-4 title">Sign in with</h5>
                </div>
                <div className="d-flex flex-column gap-2">
                  <button
                    type="button"
                    className="btn btn-social-figma"
                    id="google"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    <svg
                      className="btn-social-figma-icon"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {googleLoading ? "Signing in..." : "Continue with Google"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-social-figma"
                    id="github"
                    onClick={handleGitHubSignIn}
                  >
                    <img
                      src={githubIcon}
                      alt="Github"
                      className="btn-social-figma-icon"
                    />
                    Continue with GitHub
                  </button>
                </div>
              </div>
            </Form>
          </div>
        </Col>
      </Row>
    </NonAuthLayoutWrapper>
  );
};

export default Login;

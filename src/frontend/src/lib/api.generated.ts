/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export enum WatchStatus {
  Planned = "Planned",
  Watching = "Watching",
  Completed = "Completed",
  Dropped = "Dropped",
}

export enum GroupType {
  Public = "Public",
  Private = "Private",
  Personal = "Personal",
}

export enum GroupRole {
  Viewer = "Viewer",
  Member = "Member",
  Admin = "Admin",
  Owner = "Owner",
}

export enum Emotion {
  Joy = "Joy",
  Sadness = "Sadness",
  Excitement = "Excitement",
  Cringe = "Cringe",
  Confused = "Confused",
  Neutral = "Neutral",
}

export enum ContentType {
  Movie = "Movie",
  Series = "Series",
  Anime = "Anime",
  Cartoon = "Cartoon",
  Show = "Show",
}

export interface AuthResponse {
  token?: string | null;
  user?: UserDto;
}

export interface CreateGroupRequest {
  name?: string | null;
  isPrivate?: boolean;
  password?: string | null;
  defaultRole?: GroupRole;
}

export interface CreateMovieRequest {
  title?: string | null;
  description?: string | null;
  type?: ContentType;
  /** @format int32 */
  year?: number | null;
  genre?: string | null;
  posterUrl?: string | null;
}

export interface CreateWatchEntryRequest {
  /** @format int32 */
  movieId?: number;
  status?: WatchStatus;
  /** @format int32 */
  myRating?: number | null;
  /** @format int32 */
  partnerRating?: number | null;
  emotion?: Emotion;
  comment?: string | null;
  privateComment?: string | null;
  /** @format date-time */
  startedAt?: string | null;
  /** @format date-time */
  completedAt?: string | null;
  /** @format int32 */
  groupId?: number | null;
  /** @format int32 */
  rating?: number | null;
  /** @format int32 */
  currentSeason?: number | null;
  /** @format int32 */
  currentEpisode?: number | null;
  /** @format int32 */
  totalEpisodes?: number | null;
  /** @format int32 */
  watchingTime?: number | null;
  ratings?: UserRatingInput[] | null;
  viewers?: number[] | null;
}

export interface EntryRatingDto {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  userId?: number;
  displayName?: string | null;
  /** @format int32 */
  rating?: number;
}

export interface ErrorResponse {
  message?: string | null;
}

export interface GenerateOtpResponse {
  code?: string | null;
  /** @format date-time */
  expiresAt?: string;
}

export interface GroupDto {
  /** @format int32 */
  id?: number;
  name?: string | null;
  inviteCode?: string | null;
  /** @format int32 */
  createdByUserId?: number;
  isPrivate?: boolean;
  groupType?: GroupType;
  defaultRole?: GroupRole;
  members?: GroupMemberDto[] | null;
  /** @format date-time */
  createdAt?: string;
}

export interface GroupInfoResponse {
  exists?: boolean;
  isPrivate?: boolean;
  hasPassword?: boolean;
  groupName?: string | null;
}

export interface GroupMemberDto {
  /** @format int32 */
  userId?: number;
  displayName?: string | null;
  role?: GroupRole;
  /** @format date-time */
  joinedAt?: string;
}

export interface HealthResponse {
  status?: string | null;
}

export interface JoinGroupRequest {
  inviteCode?: string | null;
  password?: string | null;
  otp?: string | null;
}

export interface LanguageResponse {
  language?: string | null;
}

export interface LoginRequest {
  username?: string | null;
  password?: string | null;
}

export interface MemberRatingDto {
  /** @format int32 */
  userId?: number;
  displayName?: string | null;
  /** @format int32 */
  averageRating?: number;
  /** @format int32 */
  totalRated?: number;
}

export interface MovieDto {
  /** @format int32 */
  id?: number;
  title?: string | null;
  description?: string | null;
  type?: ContentType;
  /** @format int32 */
  year?: number | null;
  genre?: string | null;
  posterUrl?: string | null;
  /** @format date-time */
  createdAt?: string;
}

export interface RateRequest {
  /** @format int32 */
  rating?: number;
}

export interface RatingResponse {
  /** @format int32 */
  rating?: number;
}

export interface RegisterRequest {
  username?: string | null;
  password?: string | null;
  displayName?: string | null;
}

export interface SetLanguageRequest {
  language?: string | null;
}

export interface StatsDto {
  /** @format int32 */
  totalWatched?: number;
  /** @format int32 */
  totalPlanned?: number;
  /** @format int32 */
  totalWatching?: number;
  /** @format int32 */
  totalDropped?: number;
  /** @format double */
  averageMyRating?: number;
  /** @format double */
  averagePartnerRating?: number;
  byType?: Record<string, number>;
  byEmotion?: Record<string, number>;
  memberRatings?: MemberRatingDto[] | null;
}

export interface SuccessResponse {
  message?: string | null;
}

export interface TransferGroupRequest {
  /** @format int32 */
  newOwnerId?: number;
}

export interface UpdateGroupPasswordRequest {
  newPassword?: string | null;
}

export interface UpdateMemberRoleRequest {
  role?: GroupRole;
}

export interface UpdateMovieRequest {
  title?: string | null;
  description?: string | null;
  type?: ContentType;
  /** @format int32 */
  year?: number | null;
  genre?: string | null;
  posterUrl?: string | null;
}

export interface UpdateUserSettingsRequest {
  preventOthersAddingToMyPersonal?: boolean | null;
  preventMeAddingToMyPersonal?: boolean | null;
}

export interface UpdateWatchEntryRequest {
  status?: WatchStatus;
  /** @format int32 */
  myRating?: number | null;
  /** @format int32 */
  partnerRating?: number | null;
  emotion?: Emotion;
  comment?: string | null;
  privateComment?: string | null;
  /** @format date-time */
  startedAt?: string | null;
  /** @format date-time */
  completedAt?: string | null;
  /** @format int32 */
  rating?: number | null;
  /** @format int32 */
  currentSeason?: number | null;
  /** @format int32 */
  currentEpisode?: number | null;
  /** @format int32 */
  totalEpisodes?: number | null;
  /** @format int32 */
  watchingTime?: number | null;
  ratings?: UserRatingInput[] | null;
  viewers?: number[] | null;
}

export interface UploadPosterResponse {
  /** @format int32 */
  id?: number;
}

export interface UserDto {
  /** @format int32 */
  id?: number;
  username?: string | null;
  displayName?: string | null;
}

export interface UserRatingInput {
  /** @format int32 */
  userId?: number;
  /** @format int32 */
  rating?: number;
}

export interface UserSettingsDto {
  preventOthersAddingToMyPersonal?: boolean;
  preventMeAddingToMyPersonal?: boolean;
}

export interface ValidationError {
  field?: string | null;
  message?: string | null;
}

export interface ValidationErrorResponse {
  message?: string | null;
  errors?: ValidationError[] | null;
}

export interface WatchEntryDto {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  movieId?: number;
  movie?: MovieDto;
  status?: WatchStatus;
  /** @format int32 */
  groupId?: number | null;
  emotion?: Emotion;
  comment?: string | null;
  ratings?: EntryRatingDto[] | null;
  /** @format date-time */
  startedAt?: string | null;
  /** @format date-time */
  completedAt?: string | null;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
  /** @format int32 */
  currentSeason?: number | null;
  /** @format int32 */
  currentEpisode?: number | null;
  /** @format int32 */
  totalEpisodes?: number | null;
  /** @format int32 */
  watchingTime?: number | null;
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: HttpContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum HttpContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === HttpContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === HttpContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title MovieChecker.Web
 * @version 1.0
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * @description Creates a new user account and returns a JWT token
     *
     * @tags AuthEndpoints
     * @name AuthRegisterCreate
     * @summary Register a new user
     * @request POST:/api/auth/register
     */
    authRegisterCreate: (data: RegisterRequest, params: RequestParams = {}) =>
      this.request<AuthResponse, ValidationErrorResponse>({
        path: `/api/auth/register`,
        method: "POST",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Authenticates a user and returns a JWT token
     *
     * @tags AuthEndpoints
     * @name AuthLoginCreate
     * @summary Login with credentials
     * @request POST:/api/auth/login
     */
    authLoginCreate: (data: LoginRequest, params: RequestParams = {}) =>
      this.request<AuthResponse, void>({
        path: `/api/auth/login`,
        method: "POST",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Sets the user's preferred language (en or ru)
     *
     * @tags AuthEndpoints
     * @name AuthLanguageCreate
     * @summary Set preferred language
     * @request POST:/api/auth/language
     */
    authLanguageCreate: (
      data: SetLanguageRequest,
      params: RequestParams = {},
    ) =>
      this.request<LanguageResponse, any>({
        path: `/api/auth/language`,
        method: "POST",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns all groups the current user is a member of
     *
     * @tags GroupEndpoints
     * @name GroupsList
     * @summary Get my groups
     * @request GET:/api/groups
     */
    groupsList: (params: RequestParams = {}) =>
      this.request<GroupDto[], any>({
        path: `/api/groups`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Creates a new group with the current user as owner
     *
     * @tags GroupEndpoints
     * @name GroupsCreate
     * @summary Create a new group
     * @request POST:/api/groups
     */
    groupsCreate: (data: CreateGroupRequest, params: RequestParams = {}) =>
      this.request<GroupDto, any>({
        path: `/api/groups`,
        method: "POST",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns a group by its ID if the user is a member
     *
     * @tags GroupEndpoints
     * @name GroupsDetail
     * @summary Get group by ID
     * @request GET:/api/groups/{id}
     */
    groupsDetail: (id: number, params: RequestParams = {}) =>
      this.request<GroupDto, void>({
        path: `/api/groups/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Validates an invite code and returns group info
     *
     * @tags GroupEndpoints
     * @name GroupsCheckInviteCreate
     * @summary Check invite code
     * @request POST:/api/groups/check-invite
     */
    groupsCheckInviteCreate: (
      data: JoinGroupRequest,
      params: RequestParams = {},
    ) =>
      this.request<GroupInfoResponse, ErrorResponse>({
        path: `/api/groups/check-invite`,
        method: "POST",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Joins a group using an invite code and password/OTP
     *
     * @tags GroupEndpoints
     * @name GroupsJoinCreate
     * @summary Join a group
     * @request POST:/api/groups/join
     */
    groupsJoinCreate: (data: JoinGroupRequest, params: RequestParams = {}) =>
      this.request<GroupDto, ErrorResponse | void>({
        path: `/api/groups/join`,
        method: "POST",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Leaves a group
     *
     * @tags GroupEndpoints
     * @name GroupsLeaveDelete
     * @summary Leave a group
     * @request DELETE:/api/groups/{id}/leave
     */
    groupsLeaveDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, void>({
        path: `/api/groups/${id}/leave`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Removes a member from the group (Admin/Owner only)
     *
     * @tags GroupEndpoints
     * @name GroupsMembersDelete
     * @summary Remove a member from group
     * @request DELETE:/api/groups/{id}/members/{userId}
     */
    groupsMembersDelete: (
      id: number,
      userId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse | void>({
        path: `/api/groups/${id}/members/${userId}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Transfers group ownership to another member (Owner only)
     *
     * @tags GroupEndpoints
     * @name GroupsTransferUpdate
     * @summary Transfer group ownership
     * @request PUT:/api/groups/{id}/transfer
     */
    groupsTransferUpdate: (
      id: number,
      data: TransferGroupRequest,
      params: RequestParams = {},
    ) =>
      this.request<GroupDto, ErrorResponse | void>({
        path: `/api/groups/${id}/transfer`,
        method: "PUT",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Updates a member's role in the group (Admin/Owner only)
     *
     * @tags GroupEndpoints
     * @name GroupsMembersRoleUpdate
     * @summary Update member role
     * @request PUT:/api/groups/{id}/members/{userId}/role
     */
    groupsMembersRoleUpdate: (
      id: number,
      userId: number,
      data: UpdateMemberRoleRequest,
      params: RequestParams = {},
    ) =>
      this.request<GroupDto, ErrorResponse>({
        path: `/api/groups/${id}/members/${userId}/role`,
        method: "PUT",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Generates a one-time password for joining a private group
     *
     * @tags GroupEndpoints
     * @name GroupsGenerateOtpCreate
     * @summary Generate OTP for group
     * @request POST:/api/groups/{id}/generate-otp
     */
    groupsGenerateOtpCreate: (id: number, params: RequestParams = {}) =>
      this.request<GenerateOtpResponse, ErrorResponse | void>({
        path: `/api/groups/${id}/generate-otp`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Updates the password for a private group
     *
     * @tags GroupEndpoints
     * @name GroupsPasswordUpdate
     * @summary Update group password
     * @request PUT:/api/groups/{id}/password
     */
    groupsPasswordUpdate: (
      id: number,
      data: UpdateGroupPasswordRequest,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponse, ErrorResponse | void>({
        path: `/api/groups/${id}/password`,
        method: "PUT",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns the health status of the API
     *
     * @tags MovieChecker.Web
     * @name HealthList
     * @summary Health check
     * @request GET:/api/health
     */
    healthList: (params: RequestParams = {}) =>
      this.request<HealthResponse, any>({
        path: `/api/health`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags MovieChecker.Web
     * @name TestLocalizationAllErrorsList
     * @request GET:/api/test-localization/all-errors
     */
    testLocalizationAllErrorsList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/test-localization/all-errors`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags MovieChecker.Web
     * @name TestLocalizationTestErrorDetail
     * @request GET:/api/test-localization/test-error/{key}
     */
    testLocalizationTestErrorDetail: (
      key: string,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/test-localization/test-error/${key}`,
        method: "GET",
        ...params,
      }),

    /**
     * @description Returns a list of all movies, optionally filtered by type
     *
     * @tags MovieEndpoints
     * @name MoviesList
     * @summary Get all movies
     * @request GET:/api/movies
     */
    moviesList: (
      query?: {
        type?: ContentType;
      },
      params: RequestParams = {},
    ) =>
      this.request<MovieDto[], any>({
        path: `/api/movies`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Creates a new movie entry
     *
     * @tags MovieEndpoints
     * @name MoviesCreate
     * @summary Create a new movie
     * @request POST:/api/movies
     */
    moviesCreate: (data: CreateMovieRequest, params: RequestParams = {}) =>
      this.request<MovieDto, any>({
        path: `/api/movies`,
        method: "POST",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns a single movie by its ID
     *
     * @tags MovieEndpoints
     * @name MoviesDetail
     * @summary Get movie by ID
     * @request GET:/api/movies/{id}
     */
    moviesDetail: (id: number, params: RequestParams = {}) =>
      this.request<MovieDto, void>({
        path: `/api/movies/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Updates an existing movie
     *
     * @tags MovieEndpoints
     * @name MoviesUpdate
     * @summary Update a movie
     * @request PUT:/api/movies/{id}
     */
    moviesUpdate: (
      id: number,
      data: UpdateMovieRequest,
      params: RequestParams = {},
    ) =>
      this.request<MovieDto, void>({
        path: `/api/movies/${id}`,
        method: "PUT",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Deletes a movie by its ID
     *
     * @tags MovieEndpoints
     * @name MoviesDelete
     * @summary Delete a movie
     * @request DELETE:/api/movies/{id}
     */
    moviesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, void>({
        path: `/api/movies/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Searches movies by title or description
     *
     * @tags MovieEndpoints
     * @name MoviesSearchList
     * @summary Search movies
     * @request GET:/api/movies/search
     */
    moviesSearchList: (
      query: {
        q: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<MovieDto[], any>({
        path: `/api/movies/search`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Uploads a poster image (max 5MB, jpg/png/webp/gif)
     *
     * @tags UploadEndpoints
     * @name UploadPosterCreate
     * @summary Upload a poster image
     * @request POST:/api/upload/poster
     */
    uploadPosterCreate: (
      data: {
        /** @format binary */
        file: File;
      },
      params: RequestParams = {},
    ) =>
      this.request<UploadPosterResponse, ErrorResponse>({
        path: `/api/upload/poster`,
        method: "POST",
        body: data,
        type: HttpContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns a poster image by its ID
     *
     * @tags UploadEndpoints
     * @name PostersDetail
     * @summary Get a poster image
     * @request GET:/api/posters/{id}
     */
    postersDetail: (id: number, params: RequestParams = {}) =>
      this.request<void, void>({
        path: `/api/posters/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * @description Returns current user's settings
     *
     * @tags UserSettingsEndpoints
     * @name UserSettingsList
     * @summary Get user settings
     * @request GET:/api/user-settings
     */
    userSettingsList: (params: RequestParams = {}) =>
      this.request<UserSettingsDto, any>({
        path: `/api/user-settings`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Updates current user's settings
     *
     * @tags UserSettingsEndpoints
     * @name UserSettingsUpdate
     * @summary Update user settings
     * @request PUT:/api/user-settings
     */
    userSettingsUpdate: (
      data: UpdateUserSettingsRequest,
      params: RequestParams = {},
    ) =>
      this.request<UserSettingsDto, any>({
        path: `/api/user-settings`,
        method: "PUT",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns all watch entries for the current user or group
     *
     * @tags WatchEntryEndpoints
     * @name WatchEntriesList
     * @summary Get all watch entries
     * @request GET:/api/watch-entries
     */
    watchEntriesList: (
      query?: {
        status?: WatchStatus;
        /** @format int32 */
        groupId?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<WatchEntryDto[], ErrorResponse>({
        path: `/api/watch-entries`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Creates a new watch entry for a movie
     *
     * @tags WatchEntryEndpoints
     * @name WatchEntriesCreate
     * @summary Create a new watch entry
     * @request POST:/api/watch-entries
     */
    watchEntriesCreate: (
      data: CreateWatchEntryRequest,
      params: RequestParams = {},
    ) =>
      this.request<WatchEntryDto, ErrorResponse>({
        path: `/api/watch-entries`,
        method: "POST",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns a single watch entry by its ID
     *
     * @tags WatchEntryEndpoints
     * @name WatchEntriesDetail
     * @summary Get watch entry by ID
     * @request GET:/api/watch-entries/{id}
     */
    watchEntriesDetail: (id: number, params: RequestParams = {}) =>
      this.request<WatchEntryDto, ErrorResponse | void>({
        path: `/api/watch-entries/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Updates an existing watch entry
     *
     * @tags WatchEntryEndpoints
     * @name WatchEntriesUpdate
     * @summary Update a watch entry
     * @request PUT:/api/watch-entries/{id}
     */
    watchEntriesUpdate: (
      id: number,
      data: UpdateWatchEntryRequest,
      params: RequestParams = {},
    ) =>
      this.request<WatchEntryDto, ErrorResponse | void>({
        path: `/api/watch-entries/${id}`,
        method: "PUT",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Deletes a watch entry by its ID
     *
     * @tags WatchEntryEndpoints
     * @name WatchEntriesDelete
     * @summary Delete a watch entry
     * @request DELETE:/api/watch-entries/{id}
     */
    watchEntriesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse | void>({
        path: `/api/watch-entries/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Returns statistics for the current user's or group's watch entries
     *
     * @tags WatchEntryEndpoints
     * @name WatchEntriesStatsList
     * @summary Get watch statistics
     * @request GET:/api/watch-entries/stats
     */
    watchEntriesStatsList: (
      query?: {
        /** @format int32 */
        groupId?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<StatsDto, ErrorResponse>({
        path: `/api/watch-entries/stats`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Adds or updates a rating for a watch entry
     *
     * @tags WatchEntryEndpoints
     * @name WatchEntriesRateCreate
     * @summary Rate a watch entry
     * @request POST:/api/watch-entries/{id}/rate
     */
    watchEntriesRateCreate: (
      id: number,
      data: RateRequest,
      params: RequestParams = {},
    ) =>
      this.request<RatingResponse, ErrorResponse | void>({
        path: `/api/watch-entries/${id}/rate`,
        method: "POST",
        body: data,
        type: HttpContentType.Json,
        format: "json",
        ...params,
      }),
  };
}

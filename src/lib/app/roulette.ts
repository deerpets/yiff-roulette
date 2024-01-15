import { DocumentReference, FieldValue, collection, serverTimestamp, type DocumentData, type Unsubscribe } from "@firebase/firestore"


export const submission_wait_time_m = 5;
export const ballot_wait_time_m = 3;

export enum GameState {
    Menu,
    Lobby,
    Submission,
    Voting,
    Results,
}

export class GameData {
    room_code: string = ""
    nickname: string = ""
    room_ref: DocumentReference<DocumentData, DocumentData> | undefined
    room_data: RoomData = new RoomData()
    unsub: Unsubscribe | undefined
    owner_timer: number | undefined
    image_cache: Map<number, HTMLImageElement> = new Map()
}

/// Class representing RoomData
export class RoomData {
    players: string[] = []
    owner: string = ""
    phase: GameState = GameState.Menu
    phase_end_time: Date = new Date()
    created_time: FieldValue = serverTimestamp()
    submissions: Map<string, number> = new Map()
    votes: Map<number, Map<string, string>> = new Map()
    voting_round: number = 0
}

/// Fetch a cookie by name (https://stackoverflow.com/a/49224652)
export function getCookie(name: string) {
    let cookie: Map<string, string> = new Map();
    document.cookie.split(';').forEach(function (el) {
        let split = el.split('=');
        cookie.set(split[0].trim(), split.slice(1).join("="));
    })
    return cookie.get(name);
}

/// Set cookies used by the game
export function setGameCookie(room_code: string, nickname: string) {
    // Set the expiry time to 24 hours from now
    let expiry_date = new Date(Date.now() + (24 * 60 * 60 * 1000));
    const expires = "expires=" + expiry_date.toUTCString();
    const samesite = "SameSite=Lax";

    document.cookie = `room_code=${room_code};${samesite};${expires};path=/`;
    document.cookie = `nickname=${nickname};${samesite};${expires};path=/`;
}

/// Delete a cookie by setting it to expire in the past
export function deleteCookie(name: string) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;SameSite=Lax;path=/`;
}

/// Deletes cookies used by the game
export function deleteGameCookie() {
    deleteCookie("room_code")
    // Commenting this out as currently "Exit Room" uses this function
    // We probably don't need to be paranoid about cleaning cookies with such short TTL anyway
    //deleteCookie("nickname")
}

/// Fetches a dict of the cookies used by the game
export function getGameCookie() {
    return { room_code: getCookie("room_code"), nickname: getCookie("nickname") }
}

export function getEpochSeconds() {
    return Math.floor(new Date().getTime() / 1000);
}

export function formatDuration(time_s: number) {
    time_s = Math.round(time_s);

    if (time_s < 0) {
        return "too late!";
    } else {
        let s_left: string = (time_s % 60).toString();
        if (time_s < 61) {
            return `${s_left} seconds!!!`;
        } else {
            const m_left = Math.floor(time_s / 60);
            if (+s_left < 10) {
                // if only we had `left-pad` we wouldn't have to do this!!
                // noo! why!!!
                s_left = `0${s_left}`;
            }
            return `${m_left}:${s_left}`;
        }
    }
}
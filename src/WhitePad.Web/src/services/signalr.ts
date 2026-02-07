import * as signalR from '@microsoft/signalr';

export function createSignalRConnection(hubUrl: string): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl)
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();
}

import { Injectable, Inject, OnDestroy } from '@angular/core';

import {
  Auth0Client,
  RedirectLoginOptions,
  PopupLoginOptions,
  PopupConfigOptions,
  RedirectLoginResult,
} from '@auth0/auth0-spa-js';

import { of, from, BehaviorSubject, Subject, Observable } from 'rxjs';

import { concatMap, tap, map, filter, take, takeUntil } from 'rxjs/operators';
import { Auth0ClientService } from './auth.client';
import { WindowService } from './window';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private userSubject$ = new BehaviorSubject<any>(null);
  private isLoadingSubject$ = new BehaviorSubject(true);

  // https://stackoverflow.com/a/41177163
  private ngUnsubscribe$ = new Subject();

  readonly user$ = this.userSubject$.asObservable();
  readonly isLoading$ = this.isLoadingSubject$.asObservable();

  constructor(
    @Inject(Auth0ClientService) private auth0Client: Auth0Client,
    @Inject(WindowService) private window: Window
  ) {
    // Handle callback
    this.handleRedirectCallback()
      .pipe(takeUntil(this.ngUnsubscribe$))
      .subscribe();

    // Handle checkSession
    from(this.auth0Client.checkSession())
      .pipe(
        takeUntil(this.ngUnsubscribe$),
        tap(() => {
          this.isLoadingSubject$.next(false);
          this.isLoadingSubject$.complete();
        })
      )
      .subscribe();
  }

  /**
   * Called when the service is destroyed
   */
  ngOnDestroy() {
    // https://stackoverflow.com/a/41177163
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
  }

  /**
   * ```js
   * loginWithRedirect(options);
   * ```
   *
   * Performs a redirect to `/authorize` using the parameters
   * provided as arguments. Random and secure `state` and `nonce`
   * parameters will be auto-generated.
   *
   * @param options The login options
   */
  loginWithRedirect(options?: RedirectLoginOptions): Observable<void> {
    return from(this.auth0Client.loginWithRedirect(options));
  }

  /**
   * ```js
   * await loginWithPopup(options);
   * ```
   *
   * Opens a popup with the `/authorize` URL using the parameters
   * provided as arguments. Random and secure `state` and `nonce`
   * parameters will be auto-generated. If the response is successful,
   * results will be valid according to their expiration times.
   *
   * IMPORTANT: This method has to be called from an event handler
   * that was started by the user like a button click, for example,
   * otherwise the popup will be blocked in most browsers.
   *
   * @param options The login options
   * @param config Configuration for the popup window
   */
  loginWithPopup(
    options?: PopupLoginOptions,
    config?: PopupConfigOptions
  ): Observable<void> {
    return from(this.auth0Client.loginWithPopup(options, config));
  }

  private shouldHandleCallback(): Observable<boolean> {
    return of(this.window.location.search).pipe(
      map((search) => search.includes('code=') && search.includes('state='))
    );
  }

  private handleRedirectCallback(): Observable<RedirectLoginResult> {
    return this.shouldHandleCallback().pipe(
      filter((value) => value),
      take(1), // not sure if this is needed
      concatMap(() => from(this.auth0Client.handleRedirectCallback()))
    );
  }
}

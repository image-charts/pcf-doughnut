/**
 * DoughnutChartGenerator - Image-Charts PCF Component
 * @version 1.0.0
 */

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import {
  computeHmacSha256Sync, normalizeColors, parseDataValues, formatDataAwesome,
  parseLabels, formatLabels, parseAdvancedOptions, isValidHostname,
  debounce, loadImageWithRetry, createErrorPlaceholder,
  DEFAULT_DEBOUNCE_MS, DEFAULT_TIMEOUT_MS
} from "../shared/image-charts-utils";

export class DoughnutChartGenerator implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private _container!: HTMLDivElement;
  private _imgElement!: HTMLImageElement;
  private _debugElement: HTMLDivElement | null = null;
  private _signedUrl: string = "";
  private _notifyOutputChanged!: () => void;
  private _isLoading: boolean = false;
  private _debouncedUpdate!: (context: ComponentFramework.Context<IInputs>) => void;

  public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
    this._notifyOutputChanged = notifyOutputChanged;
    this._container = container;
    this._container.className = 'image-charts-doughnut-container';
    this._imgElement = document.createElement("img");
    this._imgElement.className = 'image-charts-doughnut';
    this._container.appendChild(this._imgElement);
    this._debouncedUpdate = debounce((ctx) => this._performUpdate(ctx), DEFAULT_DEBOUNCE_MS);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void { this._debouncedUpdate(context); }

  private _performUpdate(context: ComponentFramework.Context<IInputs>): void {
    const accountId = context.parameters.accountId?.raw || "";
    const secretKey = context.parameters.secretKey?.raw || "";
    const privateCloudDomain = context.parameters.privateCloudDomain?.raw || "";
    const data = context.parameters.data?.raw || "";
    const labels = context.parameters.labels?.raw || "";
    const colors = context.parameters.colors?.raw || "";
    const title = context.parameters.title?.raw || "";
    const chartSize = context.parameters.chartSize?.raw || "300x300";
    const advancedOptions = context.parameters.advancedOptions?.raw || "";
    const showDebugUrl = context.parameters.showDebugUrl?.raw || false;
    const errorPlaceholderUrl = context.parameters.errorPlaceholderUrl?.raw || "";

    if (!data) { this._showError("Missing chart data", errorPlaceholderUrl); return; }
    const isEnterpriseMode = accountId && secretKey;
    const isPrivateCloudMode = privateCloudDomain && isValidHostname(privateCloudDomain);
    if (!isEnterpriseMode && !isPrivateCloudMode) { this._showError("Missing authentication", errorPlaceholderUrl); return; }

    const url = this._buildChartUrl({ accountId, secretKey, privateCloudDomain, data, labels, colors, title, chartSize, advancedOptions });
    this._signedUrl = url;
    this._loadImage(url, errorPlaceholderUrl);
    this._updateDebugDisplay(showDebugUrl, url);
    this._notifyOutputChanged();
  }

  private _buildChartUrl(params: any): string {
    const host = params.privateCloudDomain || 'image-charts.com';
    const dataValues = parseDataValues(params.data);
    const queryParts: string[] = [`cht=pd`, `chs=${params.chartSize}`, `chd=${formatDataAwesome(dataValues)}`];
    if (params.labels) queryParts.push(`chl=${formatLabels(parseLabels(params.labels))}`);
    if (params.colors) { const c = normalizeColors(params.colors); if (c) queryParts.push(`chco=${c}`); }
    if (params.title) queryParts.push(`chtt=${params.title}`);
    const adv = parseAdvancedOptions(params.advancedOptions);
    for (const [k, v] of Object.entries(adv)) queryParts.push(`${k}=${v}`);
    if (params.accountId && !params.privateCloudDomain) queryParts.push(`icac=${params.accountId}`);
    const qs = queryParts.join('&');
    if (params.accountId && params.secretKey && !params.privateCloudDomain) {
      return `https://${host}/chart?${qs}&ichm=${computeHmacSha256Sync(params.secretKey, qs)}`;
    }
    return `https://${host}/chart?${qs}`;
  }

  private _loadImage(url: string, errorPlaceholderUrl: string): void {
    if (this._isLoading) return;
    this._isLoading = true;
    this._clearError();
    loadImageWithRetry(url, { maxRetries: 3, totalTimeout: DEFAULT_TIMEOUT_MS })
      .then(() => { this._imgElement.src = url; this._imgElement.style.display = 'block'; this._isLoading = false; })
      .catch((e: Error) => { this._showError(e.message, errorPlaceholderUrl); this._isLoading = false; });
  }

  private _showError(msg: string, url: string): void {
    this._imgElement.style.display = 'none'; this._signedUrl = "";
    const ex = this._container.querySelector('.image-charts-error'); if (ex) ex.remove();
    this._container.appendChild(createErrorPlaceholder(msg, url || undefined));
    this._notifyOutputChanged();
  }

  private _clearError(): void { const e = this._container.querySelector('.image-charts-error'); if (e) e.remove(); }

  private _updateDebugDisplay(show: boolean, url: string): void {
    if (show) {
      if (!this._debugElement) { this._debugElement = document.createElement('div'); this._debugElement.className = 'image-charts-debug-url'; this._container.appendChild(this._debugElement); }
      this._debugElement.textContent = url; this._debugElement.style.display = 'block';
    } else if (this._debugElement) { this._debugElement.style.display = 'none'; }
  }

  public getOutputs(): IOutputs { return { signedUrl: this._signedUrl }; }
  public destroy(): void {}
}

<div class="row mipush settings">
	<div class="col-xs-12">
		<!-- IF !setupRequired -->
		<div class="panel panel-success">
			<div class="panel-body">
				<img class="pb-logo pull-right" src="http://s01.mifile.cn/i/about/index_logo.jpg" />
				<h1>mipush Notification Settings</h1>
				<p class="lead">
					Customise your mipush integration with <strong>{site_title}</strong> here.
				</p>

				<div class="row">
					<div class="col-sm-9">
						<div class="panel panel-default">
							<div class="panel-heading">
								<h2 class="panel-title">General Settings</h2>
							</div>
							<div class="panel-body">
								<form role="form" class="form mipush-settings">
									<div class="checkbox">
										<label for="enabled">
											<input id="enabled" name="mipush:enabled" type="checkbox" /> Enable mipush Notifications
										</label>
									</div>
									<div class="form-group">
										<label for="target">Send notifications only to this device</label>
										<select class="form-control" name="mipush:target" id="target">
											<option value="">All associated devices</option>
											<!-- BEGIN devices -->
											<option value="{devices.regid}">{devices.regid} {devices.phone}</option>
											<!-- END devices -->
										</select>
									</div>
									<button type="button" class="btn btn-primary" id="save">Save Settings</button>
									<button type="button" class="btn btn-link" id="test">Send Test Notification</button>
								</form>
							</div>
						</div>
					</div>
					<div class="col-sm-3">
						<div class="panel panel-danger">
							<div class="panel-heading">
								<h2 class="panel-title">Disassociate</h2>
							</div>
							<div class="panel-body">
								<button type="button" class="btn btn-block btn-danger" id="disassociate">Disassociate with mipush</button>
								<p>
									By disassociating with mipush, your account will no longer be tied to your mipush account.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<!-- ELSE -->
		<div class="panel panel-default">
			<div class="panel-body text-center">
				<img class="pb-logo" src="https://mipush.com/assets/logo_mipush_white-3eb8aabda1203422f7154e259189a61722696a55eb511be7844a64e094a01d18.svg" />
				<p class="lead">
					This account is not currently associated with any mipush enabled devices.
				</p>

				<p>
					Please launch the <strong>{site_title}</strong> application on your device and login as normal for the association to complete
				</p>

			</div>
		</div>
		<!-- ENDIF !setupRequired -->
	</div>
</div>
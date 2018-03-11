<div class="row mipush">
	<div class="col-lg-9">
		<div class="panel panel-default">
			<div class="panel-heading"><i class="fa fa-mobile"></i> mipush Notifications</div>
			<div class="panel-body">
				<p class="lead">
					Allows NodeBB to interface with the mipush service in order to provide push notifications to mipush applications.
				</p>

				<ol>
					<li>Install and activate this plugin.</li>
					<li>
						<a href="https://dev.mi.com/console/appservice/push.html">Register an application via the mipush website</a>, and obtain REST API key.<br />
					</li>
					<li>Enter the REST API key into the configuration block below, and save.</li>
					<li>Reload NodeBB.</li>
				</ol>

				<div class="row">
					<div class="col-sm-6 well">
						<form class="form mipush-settings">
							<div class="form-group">
								<label for="package-name">package name</label>
								<input type="text" class="form-control" id="package-name" name="package-name" />
							</div>
							<div class="form-group">
								<label for="ios-appsecret">iOS APP Secret</label>
								<input type="text" class="form-control" id="ios-appsecret" name="ios-appsecret" />
							</div>
							<div class="form-group">
								<label for="android-appsecret">Android APP Secret</label>
								<input type="text" class="form-control" id="android-appsecret" name="android-appsecret" />
							</div>
						</form>
					</div>
					<div class="col-sm-6">
						<div class="panel panel-default">
							<div class="panel-heading">
								Users Associated with mipush <span class="label label-info">{numAssoc}</span>
							</div>
							<div class="panel-body">
								<ul class="users">
									<!-- BEGIN users -->
									<li>
										<img src="{users.picture}" title="{users.username}" />
									</li>
									<!-- END users -->
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="col-lg-3">
		<div class="panel panel-default">
			<div class="panel-heading">mipush Control Panel</div>
			<div class="panel-body">
				<button class="btn btn-primary" id="save">Save Settings</button>
			</div>
		</div>
	</div>
</div>

<script type="text/javascript">
	require(['settings'], function(Settings) {
		Settings.load('mipush', $('.mipush-settings'));

		$('#save').on('click', function() {
			Settings.save('mipush', $('.mipush-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'mipush-saved',
					title: 'Reload Required',
					message: 'Please reload your NodeBB to complete configuration of the mipush plugin',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				})
			});
		});
	});
</script>
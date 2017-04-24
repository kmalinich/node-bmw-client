<!DOCTYPE html>
<html lang="en">
	<head>
		<?php include './include/head.php'; ?>
		<?php include './include/css.php'; ?>
	</head>
	<body>
		<?php include './include/navbar.php'; ?>
		<div class="container-fluid">
			<h2>HDMI control</h2>
			<button class="btn btn-primary btn-lg btn-block btn-raised" onclick="javascript:hdmi_command('poweron');"><i class="material-icons">power new</i> Power on</button>
			<button class="btn btn-primary btn-lg btn-block btn-raised" onclick="javascript:hdmi_command('poweroff');"><i class="material-icons">power new</i> Power off</button>
		</div>
	</body>
	<?php include './include/js.php'; ?>
</html>

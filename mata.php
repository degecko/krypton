<?php

	include('PasswordHash.php');
	$mata = new PasswordHash(13, true);
	echo $mata->HashPassword('scripting3d');
	
	?>
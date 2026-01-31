using System.Collections.Generic;

namespace MovieChecker.Infrastructure.Services;

public class LocalizationService
{
    private static readonly Dictionary<string, Dictionary<string, string>> Translations = new()
    {
        ["en"] = new Dictionary<string, string>
        {
            ["MovieNotFound"] = "Movie not found",
            ["InsufficientPermissionsEdit"] = "Insufficient permissions to edit this entry",
            ["InsufficientPermissionsCreate"] = "Insufficient permissions to create entries in this group",
            ["InsufficientPermissionsDelete"] = "Insufficient permissions to delete this entry",
            ["InsufficientPermissionsView"] = "Insufficient permissions to view this group",
            ["InsufficientPermissionsViewEntry"] = "Insufficient permissions to view this entry",
            ["InsufficientPermissionsRate"] = "Insufficient permissions to rate this entry",
            ["InsufficientPermissionsStats"] = "Insufficient permissions to view group statistics",
            ["InsufficientPermissionsRemove"] = "Insufficient permissions to remove members from this group",
            ["InsufficientPermissionsChangeRole"] = "Insufficient permissions to change member roles",
            ["InsufficientPermissionsOtp"] = "Insufficient permissions to generate OTP codes",
            ["InsufficientPermissionsPassword"] = "Insufficient permissions to change group password",
            ["OnlyOwnerTransfer"] = "Only the owner can transfer ownership",
            ["AdminsCannotModify"] = "Admins cannot modify other admins' roles",
            ["EntryAlreadyExistsGroup"] = "Entry already exists in this group",
            ["EntryAlreadyExists"] = "Watch entry already exists for this movie",
            ["AlreadyMember"] = "Already a member of this group",
            ["InvalidOrExpiredOtp"] = "Invalid or expired OTP code",
            ["PasswordOrOtpRequired"] = "Password or OTP is required for this private group",
            ["OtpOnlyGroup"] = "This private group requires an OTP code. Password is disabled.",
            ["CannotRemoveOwner"] = "Cannot remove the group owner",
            ["MustBeMember"] = "newOwnerId must be a member of the group",
            ["CannotChangeOwnerRole"] = "Cannot change the owner's role. Use transfer ownership instead.",
            ["UseTransferOwnership"] = "Use transfer ownership to make someone owner",
            ["OtpOnlyForPrivate"] = "OTP codes can only be generated for private groups",
        },
        ["ru"] = new Dictionary<string, string>
        {
            ["MovieNotFound"] = "Фильм не найден",
            ["InsufficientPermissionsEdit"] = "Недостаточно прав для редактирования этой записи",
            ["InsufficientPermissionsCreate"] = "Недостаточно прав для создания записей в этой группе",
            ["InsufficientPermissionsDelete"] = "Недостаточно прав для удаления этой записи",
            ["InsufficientPermissionsView"] = "Недостаточно прав для просмотра этой группы",
            ["InsufficientPermissionsViewEntry"] = "Недостаточно прав для просмотра этой записи",
            ["InsufficientPermissionsRate"] = "Недостаточно прав для оценки этой записи",
            ["InsufficientPermissionsStats"] = "Недостаточно прав для просмотра статистики группы",
            ["InsufficientPermissionsRemove"] = "Недостаточно прав для удаления участников из этой группы",
            ["InsufficientPermissionsChangeRole"] = "Недостаточно прав для изменения ролей участников",
            ["InsufficientPermissionsOtp"] = "Недостаточно прав для генерации OTP кодов",
            ["InsufficientPermissionsPassword"] = "Недостаточно прав для изменения пароля группы",
            ["OnlyOwnerTransfer"] = "Только владелец может передать право владения",
            ["AdminsCannotModify"] = "Администраторы не могут изменять роли других администраторов",
            ["EntryAlreadyExistsGroup"] = "Запись уже существует в этой группе",
            ["EntryAlreadyExists"] = "Запись для этого фильма уже существует",
            ["AlreadyMember"] = "Вы уже являетесь участником этой группы",
            ["InvalidOrExpiredOtp"] = "Неверный или истекший OTP код",
            ["PasswordOrOtpRequired"] = "Для этой приватной группы требуется пароль или OTP",
            ["OtpOnlyGroup"] = "Для этой приватной группы требуется OTP код. Пароль отключен.",
            ["CannotRemoveOwner"] = "Нельзя удалить владельца группы",
            ["MustBeMember"] = "newOwnerId должен быть участником группы",
            ["CannotChangeOwnerRole"] = "Нельзя изменить роль владельца. Используйте передачу владения.",
            ["UseTransferOwnership"] = "Используйте передачу владения, чтобы назначить владельцем",
            ["OtpOnlyForPrivate"] = "OTP коды можно генерировать только для приватных групп",
        }
    };

    public static string Translate(string key, string? language = null)
    {
        var lang = language?.Split('-', ',').FirstOrDefault()?.ToLower() ?? "en";
        
        // Default to English if language not supported
        if (!Translations.ContainsKey(lang))
            lang = "en";

        return Translations[lang].TryGetValue(key, out var translation) 
            ? translation 
            : Translations["en"][key]; // Fallback to English
    }
}
